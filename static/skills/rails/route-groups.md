# Lumina Rails Server — Route Groups (Skill)

You are a senior software engineer specialized in **Lumina**, a Rails gem that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **Rails (Ruby)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's route groups: configuration syntax, reserved group names (`:tenant` and `:public`), model selection, hybrid platform setups with multiple route groups, route naming conventions, how organization scoping works implicitly, custom scoping for non-tenant groups, and permission resolution across different route group contexts.

---

## Documentation

### Configuration

Define route groups in `config/initializers/lumina.rb`:

```ruby
Lumina.configure do |config|
  config.route_group :group_name, prefix: 'url-prefix', middleware: [SomeMiddleware], models: :all
end
```

### Reserved Group Names

Two group names have special behavior:

| Name | Behavior |
|---|---|
| `:tenant` | Invitation and nested routes are registered under this group's prefix |
| `:public` | Authentication is **skipped** for routes in this group |

All other group names (e.g., `:driver`, `:admin`, `:default`) are standard authenticated groups.

### Model Selection

- `models: :all` -- registers all models from `config.models`
- `models: [:posts, :categories]` -- registers only the specified model slugs

### Examples

**Simple Non-Tenant App:**

```ruby
Lumina.configure do |config|
  config.model :posts, 'Post'
  config.model :comments, 'Comment'

  config.route_group :default, prefix: '', middleware: [], models: :all
end
```

Routes: `GET /api/posts`, `POST /api/posts`, etc.

**Simple Multi-Tenant App:**

```ruby
Lumina.configure do |config|
  config.model :posts, 'Post'
  config.model :organizations, 'Organization'

  config.route_group :tenant, prefix: ':organization', middleware: [ResolveOrganizationFromRoute], models: :all

  config.multi_tenant = { organization_identifier_column: 'slug' }
end
```

Routes: `GET /api/:organization/posts`, `POST /api/:organization/posts`, etc.

**Hybrid Platform (Logistics Example):**

A logistics platform with four user types accessing the same resources differently:

```ruby
# config/initializers/lumina.rb
Lumina.configure do |config|
  config.model :trips, 'Trip'
  config.model :construction_sites, 'ConstructionSite'
  config.model :trucks, 'Truck'
  config.model :materials, 'Material'
  config.model :organizations, 'Organization'

  # Customer dashboard -- org-scoped, full CRUD
  config.route_group :tenant, prefix: ':organization', middleware: [ResolveOrganizationFromRoute], models: :all

  # Driver app -- authenticated, not org-scoped
  config.route_group :driver, prefix: 'driver', middleware: [], models: [:trips, :construction_sites, :trucks]

  # Admin panel -- authenticated, global access to everything
  config.route_group :admin, prefix: 'admin', middleware: [], models: :all

  # Public API -- no authentication, read-only reference data
  config.route_group :public, prefix: 'public', middleware: [], models: [:materials]

  config.multi_tenant = { organization_identifier_column: 'slug' }
end
```

This generates:

| Group | Example Route | Auth | Org Scoped |
|---|---|---|---|
| tenant | `GET /api/acme-corp/trips` | authenticated | Yes |
| tenant | `GET /api/acme-corp/materials` | authenticated | Yes |
| driver | `GET /api/driver/trips` | authenticated | No |
| driver | `GET /api/driver/trucks` | authenticated | No |
| admin | `GET /api/admin/trips` | authenticated | No |
| admin | `GET /api/admin/materials` | authenticated | No |
| public | `GET /api/public/materials` | None | No |

### Route Naming

All routes are named with the pattern `lumina_{group}_{model}_{action}`:

```
lumina_tenant_trips_index
lumina_tenant_trips_store
lumina_tenant_trips_show
lumina_driver_trips_index
lumina_driver_trucks_show
lumina_admin_trips_index
lumina_public_materials_index
```

### How Organization Scoping Works

Organization scoping is **implicit**, not configured per group. The ResourcesController's `apply_organization_scope` checks if the request has an organization in `request.env["lumina.organization"]`:

- **Tenant group** -- middleware sets `lumina.organization` on the request -- scoping applied
- **Other groups** -- no middleware sets organization -- scoping skipped, queries return all records

This means you do not need any extra configuration for non-tenant groups to bypass org scoping -- it happens naturally.

### Custom Scoping for Non-Tenant Groups

For groups like `driver` that need custom data filtering (e.g., a driver only sees their own trips), use standard Rails scoping mechanisms:

```ruby
# app/models/concerns/driver_scopable.rb
module DriverScopable
  extend ActiveSupport::Concern

  included do
    default_scope do
      if RequestStore.store[:route_group] == 'driver'
        where(driver_id: Current.user&.driver_id)
      else
        all
      end
    end
  end
end
```

```ruby
# app/models/trip.rb
class Trip < Lumina::LuminaModel
  include DriverScopable

  lumina_filters :status, :driver_id
  lumina_sorts :created_at, :scheduled_at
  # ...
end
```

Now when a driver accesses `GET /api/driver/trips`, they only see their own trips. When an admin accesses `GET /api/admin/trips`, they see all trips.

The current route group is available via `params[:route_group]` in the controller or via `RequestStore.store[:route_group]` in model scopes.

### Permission Resolution

Lumina uses two permission sources based on the route group context:

| Route Group | Permission Source | When Used |
|---|---|---|
| `:tenant` | `roles.permissions` (via `user_roles`) | Organization middleware sets org on request |
| Any other | `users.permissions` | No organization context |

**Setup:** Add a `permissions` JSON column to your users table:

```ruby
class AddPermissionsToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :permissions, :json
  end
end
```

Add the column to your User model:

```ruby
class User < Lumina::LuminaModel
  include Lumina::HasPermissions
  # ...
end
```

**Assigning Permissions:**

```ruby
# Driver: can view and manage their trips and trucks
driver.update!(permissions: ['trips.index', 'trips.show', 'trucks.*'])

# Platform admin: full access to everything
admin.update!(permissions: ['*'])
```

**How It Works:**

When `has_permission?` is called:
1. **Organization present** (tenant route group) -- checks `roles.permissions` for that organization via `user_roles`
2. **No organization** (any other route group) -- checks `users.permissions` directly

This is deterministic -- the decision is based on the presence of an organization in the request, which is set by middleware in tenant route groups. There is no fallback chain.

### Migration from Previous Config

If upgrading from a previous Lumina version:

**Before:**

```ruby
Lumina.configure do |config|
  config.model :posts, 'Post'
  config.public_model :materials

  config.multi_tenant = {
    enabled: true,
    use_subdomain: false,
    organization_identifier_column: 'slug'
  }
end
```

**After:**

```ruby
Lumina.configure do |config|
  config.model :posts, 'Post'
  config.model :materials, 'Material'

  config.route_group :tenant, prefix: ':organization', middleware: [ResolveOrganizationFromRoute], models: :all
  config.route_group :public, prefix: 'public', middleware: [], models: [:materials]

  config.multi_tenant = { organization_identifier_column: 'slug' }
end
```

Key changes:
- Remove `public_model` calls -- use a `:public` route group instead
- Remove `enabled`, `use_subdomain`, and `middleware` from `multi_tenant` -- these are now expressed via `route_groups`
- Keep `organization_identifier_column` in `multi_tenant` (still used by middleware)

---

## Frequently Asked Questions

**Q: What are route groups for?**

A: Route groups let you expose the same models under different URL prefixes with different middleware and authentication. This is essential for hybrid platforms -- for example, a logistics app where customers access data through org-scoped routes, drivers through a driver-specific prefix, and admins through an admin prefix.

**Q: What is special about the `:tenant` and `:public` group names?**

A: `:tenant` gets invitation and nested operation routes registered under its prefix. `:public` skips authentication middleware entirely. All other names are standard authenticated groups.

**Q: How does permission checking work across route groups?**

A: For the `:tenant` group, permissions come from `roles.permissions` via `user_roles` (org-scoped). For all other groups, permissions come from `users.permissions` (user-level JSON column).

**Q: How do I make a driver only see their own trips?**

A: Create a concern that checks the route group via `RequestStore`:

```ruby
module DriverScopable
  extend ActiveSupport::Concern

  included do
    default_scope do
      if RequestStore.store[:route_group] == 'driver'
        where(driver_id: Current.user&.driver_id)
      else
        all
      end
    end
  end
end
```

The scope only activates for the `driver` route group. Admin and tenant routes are unaffected.

**Q: How do I migrate from the old config format?**

A: Move separate multi-tenant and public settings into route groups:

```ruby
# After (route groups)
Lumina.configure do |c|
  c.route_group :tenant, prefix: ':organization', middleware: [ResolveOrganizationFromRoute], models: :all
  c.route_group :public, prefix: 'public', middleware: [], models: [:materials]
  c.multi_tenant = { organization_identifier_column: 'slug' }
end
```

Remove `public_model` calls and the `enabled`/`use_subdomain` keys from `multi_tenant`.

**Q: Can I have multiple non-tenant groups with different model sets?**

A: Yes. Each route group independently specifies which models to include:

```ruby
config.route_group :driver, prefix: 'driver', middleware: [], models: [:trips, :trucks]
config.route_group :admin, prefix: 'admin', middleware: [], models: :all
```

---

## Real-World Examples

### Example 1: Logistics Platform Request Flow

**Customer:** `GET /api/acme-corp/trips`
1. Route matches `lumina_tenant_trips_index`
2. Authentication middleware authenticates the user
3. `ResolveOrganizationFromRoute` resolves "acme-corp" to an Organization model
4. Organization is set on the request
5. ResourcesController scopes query to Acme Corp
6. Response contains only Acme Corp's trips

**Driver:** `GET /api/driver/trips`
1. Route matches `lumina_driver_trips_index`
2. Authentication middleware authenticates the user
3. No organization middleware -- no org on request
4. `DriverScopable` default scope detects `route_group = 'driver'` -- filters by `driver_id`
5. Response contains only the driver's trips

**Admin:** `GET /api/admin/trips`
1. Route matches `lumina_admin_trips_index`
2. Authentication middleware authenticates the user
3. No organization middleware -- no org on request
4. `DriverScopable` default scope detects `route_group = 'admin'` -- does nothing
5. Response contains all trips across all organizations

**Public:** `GET /api/public/materials`
1. Route matches `lumina_public_materials_index`
2. No authentication (public group)
3. No organization middleware
4. Response contains all materials

### Example 2: SaaS with Public Marketing API

```ruby
Lumina.configure do |config|
  config.model :posts, 'Post'
  config.model :pages, 'Page'
  config.model :products, 'Product'

  # Main app -- org-scoped
  config.route_group :tenant, prefix: ':organization', middleware: [ResolveOrganizationFromRoute], models: :all

  # Public marketing site -- read-only, no auth
  config.route_group :public, prefix: 'public', middleware: [], models: [:posts, :pages]
end
```

Marketing pages and blog posts are accessible without authentication at `/api/public/posts` and `/api/public/pages`, while the full CRUD is available at `/api/{org}/posts` with authentication.
