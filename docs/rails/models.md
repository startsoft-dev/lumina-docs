---
sidebar_position: 2
title: Models
---

# Models

Lumina models are standard ActiveRecord models enhanced with declarative DSL methods and concerns that control how REST API endpoints are generated and behave. By configuring these methods directly on your model, Lumina automatically builds fully-featured API endpoints with filtering, sorting, searching, pagination, validation, and authorization — all without writing controllers or routes.

## LuminaModel Base Class

The recommended way to create Lumina models is to extend `Lumina::LuminaModel` — a convenience base class that pre-includes all the core concerns you need:

```ruby title="app/models/post.rb"
class Post < Lumina::LuminaModel
  lumina_filters :status, :user_id
  lumina_sorts :created_at, :title
  lumina_search :title, :content

  validates :title, length: { maximum: 255 }, allow_nil: true
  validates :status, inclusion: { in: %w[draft published] }, allow_nil: true

  # Field permissions are controlled by the policy.
end
```

`Lumina::LuminaModel` extends `ApplicationRecord` and includes these concerns automatically:

| Concern | Purpose |
|---|---|
| `Lumina::HasLumina` | Query builder DSL (filters, sorts, includes, etc.) |
| `Lumina::HasValidation` | Role-based field allowlisting and validation |
| `Lumina::HidableColumns` | Dynamic column hiding from API responses |
| `Lumina::HasAutoScope` | Auto-discovery of `Scopes::{Model}Scope` classes (with `Lumina::ResourceScope` base) |

You no longer need to manually `include` these concerns on every model.

### Optional Concerns

These concerns are **not** included in `Lumina::LuminaModel` because they require additional database columns, gems, or relationships. Add them manually when needed:

```ruby title="app/models/post.rb"
class Post < Lumina::LuminaModel
  include Lumina::HasAuditTrail
  include Lumina::BelongsToOrganization
  include Discard::Model  # Soft deletes via discard gem
  # ...
end
```

| Concern | Purpose |
|---|---|
| `Lumina::HasAuditTrail` | Automatic change logging to `audit_logs` table |
| `Lumina::HasUuid` | Auto-generated UUID on creation |
| `Lumina::BelongsToOrganization` | Multi-tenant organization scoping |
| `Lumina::HasPermissions` | Permission checking (User model only) |
| `Discard::Model` | Soft deletes via the Discard gem |

### Customizing LuminaModel

You can publish and customize the base class for your application:

```bash title="terminal"
rails lumina:install --publish-model
```

This creates `app/models/lumina_model.rb` in your project, which extends the gem's base class. Add your own concerns or configuration that should apply to all Lumina models:

```ruby title="app/models/lumina_model.rb"
class LuminaModel < Lumina::LuminaModel
  include Lumina::HasAuditTrail  # Now all models get audit trail
end
```

:::tip
You can still extend `ApplicationRecord` directly and include concerns manually if you prefer full control. `Lumina::LuminaModel` is a convenience, not a requirement.
:::

## Model Configuration DSL

Below is a complete model example demonstrating **all** available DSL methods that Lumina recognizes:

```ruby title="app/models/post.rb"
class Post < Lumina::LuminaModel
  include Lumina::HasAuditTrail
  include Lumina::BelongsToOrganization
  include Discard::Model  # Soft deletes via discard gem

  # ── Query Builder ────────────────────────────────────────────
  lumina_filters   :status, :user_id, :category_id
  lumina_sorts     :created_at, :title, :updated_at
  lumina_default_sort '-created_at'
  lumina_fields    :id, :title, :content, :status
  lumina_includes  :user, :comments, :tags
  lumina_search    :title, :content

  # ── Pagination ───────────────────────────────────────────────
  lumina_pagination_enabled true
  lumina_per_page 25

  # ── Middleware ────────────────────────────────────────────────
  lumina_middleware 'throttle:60,1'
  lumina_middleware_actions(
    store:   ['verified'],
    destroy: ['admin']
  )

  # ── Route Exclusion ──────────────────────────────────────────
  lumina_except_actions :destroy  # skip DELETE endpoint

  # ── Relationships ────────────────────────────────────────────
  belongs_to :user
  belongs_to :blog
  has_many :comments
  has_many :tags
end
```

### DSL Reference

| DSL Method | Type | Description |
|---|---|---|
| `lumina_filters` | `*symbols` | Fields available for query-string filtering via `?filter[field]=value`. Only the fields listed here can be filtered on. |
| `lumina_sorts` | `*symbols` | Fields available for sorting via `?sort=field`. Prefix with `-` for descending order (e.g., `?sort=-created_at`). |
| `lumina_default_sort` | `string` | The sort applied when no `?sort` parameter is provided. Use the `-` prefix for descending (e.g., `'-created_at'`). |
| `lumina_fields` | `*symbols` | Fields that can be selected via sparse fieldsets (`?fields[model]=field1,field2`). Limits which columns are returned. |
| `lumina_includes` | `*symbols` | Relationships that can be eager-loaded via `?include=relation`. Must correspond to defined ActiveRecord associations on the model. |
| `lumina_search` | `*symbols/strings` | Fields searched when `?search=term` is used. Lumina performs a case-insensitive `LIKE` search across all listed fields. Supports dot-notation for relationships (e.g., `'user.name'`). |
| `lumina_pagination_enabled` | `bool` | Enables or disables pagination for the index endpoint. Defaults to `false`. |
| `lumina_per_page` | `integer` | Number of records per page when pagination is enabled. Defaults to `25`. |
| `lumina_middleware` | `*strings` | Middleware applied to **all** routes for this model. |
| `lumina_middleware_actions` | `hash` | Middleware applied to **specific** actions only. Keys are action names (`:index`, `:show`, `:store`, `:update`, `:destroy`). |
| `lumina_except_actions` | `*symbols` | List of CRUD actions to exclude from route generation. Valid values: `:index`, `:show`, `:store`, `:update`, `:destroy`. |

:::tip
You only need to declare DSL methods that differ from their defaults. For example, if you do not need filtering, simply omit `lumina_filters` entirely.
:::

## Available Concerns

Lumina provides a collection of concerns that add specific behaviors to your models. When using `Lumina::LuminaModel`, the core concerns (HasLumina, HasValidation, HidableColumns, HasAutoScope) are already included. The concerns documented below can be added individually when needed.

### HasLumina

The core concern that provides all query-related DSL methods. It sets up class attributes for filters, sorts, includes, fields, search, pagination, middleware, and more.

**Included in LuminaModel** — no need to add manually.

```ruby title="app/models/post.rb"
class Post < Lumina::LuminaModel
  # HasLumina is already included
end
```

**Also provides:**
- `uses_soft_deletes?` — Detects if the model has a `discarded_at` or `deleted_at` column

---

### HasValidation

Adds format validation to your model. Lumina calls `validate_for_action()` automatically during `store` and `update` actions.

Format constraints are defined using standard ActiveModel `validates` declarations. Field permissions (which fields each role can set) are defined on the policy.

```ruby title="app/models/post.rb"
class Post < Lumina::LuminaModel
  validates :title, length: { maximum: 255 }, allow_nil: true
  validates :status, inclusion: { in: %w[draft published archived] }, allow_nil: true
end
```

:::info
For a complete breakdown of validation behavior, see the [Validation](./validation) page.
:::

---

### HasPermissions

Adds role-based permission checking to the **User** model. Lumina uses this concern to authorize API actions automatically when policies are in place.

**Methods:**

| Method | Description |
|---|---|
| `has_permission?(permission, organization = nil)` | Returns `true` if the user has the given permission within the specified organization. |
| `role_slug_for_validation(organization = nil)` | Returns the user's role slug within an organization, used for role-based validation rules. |

**Permission format:** `{resource_slug}.{action}`

Permissions follow the pattern of the resource slug (the key in your `Lumina.configure` models block) combined with the CRUD action:

- `posts.index` — can list posts
- `posts.store` — can create posts
- `blogs.update` — can update blogs
- `posts.destroy` — can delete posts

**Wildcard support:**

- `*` — grants access to everything across all resources
- `posts.*` — grants access to all actions on posts

```ruby title="app/models/user.rb"
class User < Lumina::LuminaModel
  include Lumina::HasPermissions

  has_many :user_roles
end

# Check if a user can create posts within an organization
if user.has_permission?('posts.store', organization)
  # User can create posts
end

# Check for full access
if user.has_permission?('*', organization)
  # User has unrestricted access to everything
end

# Check for all post actions
if user.has_permission?('posts.*', organization)
  # User can index, show, store, update, and destroy posts
end
```

---

### HasAuditTrail

Automatically records changes to your model in an audit log. Lumina tracks creation, updates, deletion, force-deletion, and restoration events and stores the old and new values for each change.

**Tracked events:** `created`, `updated`, `deleted`, `force_deleted`, `restored`

**DSL Methods:**

| Method | Type | Default | Description |
|---|---|---|---|
| `lumina_audit_exclude` | `*symbols/strings` | `['password', 'remember_token']` | Fields excluded from audit log entries. Use this to prevent sensitive data from being recorded. |

```ruby title="app/models/user.rb"
class User < Lumina::LuminaModel
  include Lumina::HasAuditTrail

  # Exclude sensitive fields from audit logs
  lumina_audit_exclude :password, :remember_token, :api_token
end

# Query the audit trail for any model instance
logs = post.audit_logs.order(created_at: :desc)

# Each log entry contains:
# - action (created, updated, deleted, etc.)
# - old_values (previous state)
# - new_values (current state)
# - user_id (who made the change)
# - timestamps
```

The `audit_logs` method is a polymorphic association, so it works identically on any model that uses the concern.

:::info
For full details on querying and managing audit logs, see the [Audit Trail](./audit-trail) page.
:::

---

### HasUuid

Automatically generates a UUID for the model when it is created. The concern hooks into ActiveRecord's `before_create` callback and fills the `uuid` column if it is empty.

```ruby title="app/models/invoice.rb"
class Invoice < Lumina::LuminaModel
  include Lumina::HasUuid

  # No additional configuration needed.
  # A UUID is generated and assigned to the `uuid` column on creation.
end
```

:::warning
Your database table must have a `uuid` column. Add it in your migration:

```ruby title="db/migrate/create_invoices.rb"
t.uuid :uuid, null: true
add_index :invoices, :uuid, unique: true
```
:::

---

### BelongsToOrganization

Provides multi-tenant organization scoping. This concern automatically filters all queries to the current organization and sets the `organization_id` when creating new records.

**Adds:**

| Member | Type | Description |
|---|---|---|
| `organization` | BelongsTo association | Links the model to its owning organization. |
| `for_organization(org)` | Class method | Returns an unscoped query filtered to a specific organization. |
| Default scope | Automatic | All queries are automatically filtered by `organization_id`. |
| Auto-set on create | Automatic | `organization_id` is filled from the current request context on creation. |

```ruby title="app/models/post.rb"
class Post < Lumina::LuminaModel
  include Lumina::BelongsToOrganization

  # All queries are now scoped to the current organization automatically.
  # GET /api/acme-corp/posts -> only returns posts where organization_id matches acme-corp
end
```

**Nested ownership:**

Not every model has a direct `organization_id` column. For nested models, Lumina auto-detects the path to the organization by walking `belongs_to` relationships.

```ruby title="app/models/comment.rb"
class Comment < Lumina::LuminaModel
  include Lumina::BelongsToOrganization

  # Comment → post → blog → organization is auto-detected
  belongs_to :post
end
```

In this example, Lumina traverses `Comment -> post -> blog` to find the organization. The chain can be as deep as needed.

:::info
For a full explanation of multi-tenancy and organization scoping, see the [Multi-Tenancy](./multi-tenancy) page.
:::

---

### HidableColumns

Controls which columns are hidden from API responses. This concern provides multiple layers of column visibility control: base defaults, model-level configuration, and policy-based per-user hiding.

**Layers of hidden columns (applied in order):**

1. **Base hidden columns** (always hidden): `password`, `password_digest`, `remember_token`, `created_at`, `updated_at`, `deleted_at`, `discarded_at`, `email_verified_at`
2. **Model-level hidden columns** via `lumina_additional_hidden`: additional fields to always hide for this model
3. **Policy-level visibility** via `hidden_attributes_for_show()` / `permitted_attributes_for_show()` methods on the policy: per-user dynamic hiding

```ruby title="app/models/user.rb"
class User < Lumina::LuminaModel
  # Always hide these columns from API responses (in addition to base defaults)
  lumina_additional_hidden :api_token, :stripe_id
end
```

:::tip
Hidden columns are resolved per request based on the current user. The policy's `hidden_attributes_for_show` and `permitted_attributes_for_show` methods let you return different lists for different users.
:::

:::info
For policy-based column hiding (showing different fields to different users), see the [Policies](./policies) page.
:::

#### Computed Attributes

You can add virtual (computed) attributes to API responses by overriding `as_json` on your model. These attributes are not database columns — they are calculated at runtime and included in the serialized output.

```ruby title="app/models/contract.rb"
class Contract < Lumina::LuminaModel
  def days_until_expiry
    return nil unless expiry_date
    (expiry_date - Date.current).to_i
  end

  def risk_score
    calculate_risk
  end

  def as_json(options = {})
    super.merge(
      'days_until_expiry' => days_until_expiry,
      'risk_score' => risk_score
    )
  end
end
```

Computed attributes work seamlessly with HidableColumns — they can be hidden via policy just like database columns:

```ruby title="app/policies/contract_policy.rb"
class ContractPolicy < Lumina::ResourcePolicy
  def hidden_attributes_for_show(user)
    return [] if has_role?(user, 'admin')
    ['risk_score'] # Only admins see the risk score
  end
end
```

You can also use `permitted_attributes_for_show` to whitelist which attributes (including computed ones) each role can see. Both blacklist and whitelist policies apply to computed attributes — the controller's `as_lumina_json` method handles this automatically.

---

### HasAutoScope

Automatically applies a global scope to the model based on a naming convention. When this concern is used, Lumina looks for a scope class at `Scopes::{ModelName}Scope` (or `ModelScopes::{ModelName}Scope` as fallback) and applies it if found. No manual registration is needed.

```ruby title="app/models/post.rb"
class Post < Lumina::LuminaModel
  # HasAutoScope is already included — automatically loads Scopes::PostScope (if it exists)
end
```

#### ResourceScope Base Class (Recommended)

Extend `Lumina::ResourceScope` to get access to the current `user`, `organization`, and `role` inside your scope. This enables role-based or user-specific query filtering:

```ruby title="app/models/scopes/post_scope.rb"
module Scopes
  class PostScope < Lumina::ResourceScope
    def apply(relation)
      if role == "viewer"
        relation.where(published: true)
      else
        relation
      end
    end
  end
end
```

Available methods inside `apply`:
- **`user`** — the current authenticated user (or `nil`)
- **`organization`** — the current organization (or `nil`)
- **`role`** — shortcut for the user's role slug in the current org (or `nil`)

#### Legacy Class-Method Scopes

You can also use a plain class with `self.apply` as a class method. This approach doesn't provide access to user/org context:

```ruby title="app/models/scopes/post_scope.rb"
module Scopes
  class PostScope
    def self.apply(scope)
      scope.where(is_visible: true)
    end
  end
end
```

With either approach, every query for `Post` automatically includes the scope filter. This is useful for soft-visibility flags, status filtering, role-based access, or any default constraint you want applied globally.

:::tip
The scope is only applied if the class exists. You can safely add the `HasAutoScope` concern to any model without creating the scope class until you need it.
:::

---

## Complete Model Example

Below is a full real-world model that combines multiple Lumina concerns into a feature-rich API resource:

```ruby title="app/models/blog_post.rb"
class BlogPost < Lumina::LuminaModel
  include Lumina::HasAuditTrail
  include Lumina::HasUuid
  include Lumina::BelongsToOrganization
  include Discard::Model  # Soft deletes via discard gem

  # ── Validation ───────────────────────────────────────────────
  validates :title, length: { maximum: 255 }, allow_nil: true
  validates :slug, length: { maximum: 255 }, allow_nil: true
  validates :content, length: { maximum: 50_000 }, allow_nil: true
  validates :excerpt, length: { maximum: 500 }, allow_nil: true
  validates :status, inclusion: { in: %w[draft published archived] }, allow_nil: true

  # Field permissions are controlled by the policy.

  # ── Audit Trail ──────────────────────────────────────────────
  # No extra exclusions beyond the defaults (password, remember_token)

  # ── Query Configuration ──────────────────────────────────────
  lumina_filters   :status, :user_id, :category_id
  lumina_sorts     :created_at, :title, :published_at
  lumina_default_sort '-published_at'
  lumina_includes  :user, :category, :comments, :tags
  lumina_search    :title, :content, :excerpt
  lumina_fields    :id, :title, :slug, :excerpt, :status, :published_at

  # ── Pagination ───────────────────────────────────────────────
  lumina_pagination_enabled true
  lumina_per_page 20

  # ── Relationships ────────────────────────────────────────────
  belongs_to :user
  belongs_to :category
  has_many :comments
  has_and_belongs_to_many :tags
end
```

This single model definition gives you:

- **REST endpoints** for listing, showing, creating, updating, and soft-deleting blog posts
- **Filtering** by status, user, and category (`?filter[status]=published`)
- **Sorting** by creation date, title, or publish date (`?sort=-published_at`)
- **Full-text search** across title, content, and excerpt (`?search=rails`)
- **Eager loading** of user, category, comments, and tags (`?include=user,comments`)
- **Sparse fieldsets** to reduce payload size (`?fields[blog_posts]=id,title,excerpt`)
- **Pagination** at 20 records per page
- **Format validation** with ActiveModel validators
- **Audit logging** of every change with before/after values
- **UUID generation** for external-facing identifiers
- **Organization scoping** for multi-tenant data isolation
- **Column hiding** to keep sensitive fields out of API responses

## Registration

Models are registered in `config/initializers/lumina.rb`. The key becomes the URL slug and the permission prefix:

```ruby title="config/initializers/lumina.rb"
Lumina.configure do |c|
  c.model :'blog-posts', 'BlogPost'
  c.model :comments, 'Comment'
  c.model :categories, 'Category'
  c.model :tags, 'Tag'
end
```

With this configuration, Lumina generates routes such as:

```
GET    /api/{organization}/blog-posts
GET    /api/{organization}/blog-posts/{id}
POST   /api/{organization}/blog-posts
PUT    /api/{organization}/blog-posts/{id}
DELETE /api/{organization}/blog-posts/{id}
```

:::warning
The model key (e.g., `blog-posts`) is used as the permission prefix. Make sure it matches what you use in your role permission definitions (e.g., `blog-posts.store`, `blog-posts.index`).
:::
