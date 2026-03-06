# Lumina Rails Server — Multi-Tenancy (Skill)

You are a senior software engineer specialized in **Lumina**, a Rails gem that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **Rails (Ruby)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's multi-tenancy system: enabling organization-based data isolation, organization resolution strategies (route prefix vs subdomain), scoping models with `Lumina::BelongsToOrganization`, nested ownership via auto-detected `belongs_to` chains, per-organization roles and permissions, and access control behavior.

---

## Documentation

### Enabling Multi-Tenancy

During `rails lumina:install`, select **Yes** when asked about multi-tenant support. This creates:

- `organizations` table and model
- `roles` table and model
- `user_roles` junction table
- Organization resolution middleware
- Role and organization seeders

Or configure it manually in `config/initializers/lumina.rb`:

```ruby
Lumina.configure do |c|
  c.model :posts, 'Post'

  c.route_group :tenant, prefix: ':organization', middleware: [ResolveOrganizationFromRoute], models: :all

  c.multi_tenant = { organization_identifier_column: 'slug' }  # 'id', 'slug', or 'uuid'
end
```

For platforms that need both tenant and non-tenant routes (e.g., customer dashboard + driver app + admin panel), see the Route Groups skill.

### How It Works

When a `:tenant` route group is configured, all routes in that group include the organization:

```
/api/{organization}/posts
/api/{organization}/comments
/api/{organization}/users
```

The middleware:

1. Resolves the organization from the URL (or subdomain)
2. Validates the organization exists (404 if not)
3. Checks the authenticated user belongs to that organization (404 if not)
4. Scopes all queries to that organization automatically

### Organization Resolution Strategies

**Route Prefix (Default)**

The organization identifier is part of the URL path:

```bash
GET /api/acme-corp/posts       # Using slug
GET /api/1/posts               # Using id
GET /api/abc-123-def/posts     # Using uuid
```

Uses `Lumina::Middleware::ResolveOrganizationFromRoute`. The identifier column is configurable:

```ruby
c.multi_tenant = { organization_identifier_column: 'slug' }  # matches organizations.slug column
```

**Subdomain**

The organization is extracted from the subdomain:

```bash
GET https://acme-corp.yourapp.com/api/posts
GET https://other-org.yourapp.com/api/posts
```

Uses `Lumina::Middleware::ResolveOrganizationFromSubdomain`. Enable it:

```ruby
Lumina.configure do |c|
  c.model :posts, 'Post'

  c.route_group :tenant, prefix: '', middleware: [ResolveOrganizationFromSubdomain], models: :all

  c.multi_tenant = { organization_identifier_column: 'slug' }
end
```

The subdomain middleware automatically skips these common subdomains: `www`, `app`, `api`, `localhost`, `127.0.0.1`. Requests from these are treated as non-tenant.

### Scoping Models

Add `Lumina::BelongsToOrganization` to scope a model's data per organization:

```ruby
class Post < Lumina::LuminaModel
  include Lumina::BelongsToOrganization

  validates :title, length: { maximum: 255 }, allow_nil: true
  validates :status, inclusion: { in: %w[draft published] }, allow_nil: true

  lumina_filters :status, :user_id
  lumina_sorts :created_at, :title

  belongs_to :user
  has_many :comments
end
```

Migration must include `organization_id`:

```ruby
class CreatePosts < ActiveRecord::Migration[8.0]
  def change
    create_table :posts do |t|
      t.string :title
      t.text :content
      t.references :organization, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.datetime :discarded_at
      t.timestamps
    end
  end
end
```

Now `GET /api/acme-corp/posts` only returns posts where `organization_id` matches Acme Corp. The `organization_id` is automatically set when creating records.

### Nested Organization Ownership

Not all models have a direct `organization_id` column. For nested models, Lumina auto-detects the path to the organization by walking `belongs_to` relationships:

```ruby
class Comment < Lumina::LuminaModel
  include Lumina::BelongsToOrganization

  # Comment -> Post -> Blog -> Organization is auto-detected
  belongs_to :post
end
```

```ruby
class Post < Lumina::LuminaModel
  include Lumina::BelongsToOrganization

  # Post -> Blog -> Organization is auto-detected
  belongs_to :blog
  has_many :comments
end
```

```ruby
class Blog < Lumina::LuminaModel
  include Lumina::BelongsToOrganization

  # Blog has organization_id directly
  belongs_to :organization
  has_many :posts
end
```

### Per-Organization Roles

Users have roles scoped to each organization. A user can be **admin** in one organization and **viewer** in another.

**Setting Up Roles:**

```ruby
# db/seeds.rb
admin = Role.create!(
  name: 'Admin',
  slug: 'admin',
  permissions: ['*']
)

editor = Role.create!(
  name: 'Editor',
  slug: 'editor',
  permissions: [
    'posts.index', 'posts.show', 'posts.store', 'posts.update',
    'comments.*',
  ]
)

viewer = Role.create!(
  name: 'Viewer',
  slug: 'viewer',
  permissions: ['posts.index', 'posts.show']
)
```

**Assigning Users to Organizations:**

```ruby
# User is admin in Acme Corp
UserRole.create!(
  user_id: user.id,
  organization_id: acme_corp.id,
  role_id: admin.id
)

# Same user is viewer in Other Org
UserRole.create!(
  user_id: user.id,
  organization_id: other_org.id,
  role_id: viewer.id
)
```

**Checking Permissions:**

```ruby
# User is admin in Acme Corp
user.has_permission?('posts.store', acme_corp)   # true
user.has_permission?('posts.destroy', acme_corp)  # true (admin has *)

# Same user is viewer in Other Org
user.has_permission?('posts.store', other_org)   # false
user.has_permission?('posts.index', other_org)   # true
```

### Access Control

**User Not in Organization:**

If a user tries to access an organization they do not belong to:

```bash
curl -H "Authorization: Bearer TOKEN" /api/other-org/posts
# -> 404 { "message": "Organization not found" }
```

Returning 404 instead of 403 prevents leaking information about organization existence. Users cannot discover which organization slugs are valid.

**No Authentication:**

Requests without authentication to non-public endpoints:

```bash
curl /api/acme-corp/posts
# -> 401 { "message": "Unauthenticated." }
```

**Public Endpoints:**

Models in a `:public` route group skip authentication:

```ruby
Lumina.configure do |c|
  c.route_group :public, prefix: 'public', models: [:posts]
end
```

---

## Frequently Asked Questions

**Q: How do I enable multi-tenancy?**

A: Run `rails lumina:install` and select "Yes" for multi-tenant support. It creates the organizations, roles, and user_roles tables, middleware, and seeders. Or configure it manually in `config/initializers/lumina.rb` with a `:tenant` route group.

**Q: How do I scope my model to an organization?**

A: Two steps:
1. Add `Lumina::BelongsToOrganization` concern to your model
2. Add `organization_id` column to your migration via `t.references :organization`

```ruby
class Post < Lumina::LuminaModel
  include Lumina::BelongsToOrganization
end
```

Now all queries are automatically filtered by organization.

**Q: My model does not have `organization_id` directly. How do I scope it?**

A: Lumina auto-detects the ownership path by walking `belongs_to` relationships. Just include the `BelongsToOrganization` concern and define your associations:

```ruby
class Comment < Lumina::LuminaModel
  include Lumina::BelongsToOrganization
  belongs_to :post  # Comment -> Post -> Blog (has organization_id) is auto-detected
end
```

**Q: Can a user have different roles in different organizations?**

A: Absolutely. Each `UserRole` entry has a `user_id`, `organization_id`, and `role_id`. One user can be admin in Org A and viewer in Org B.

**Q: Why do I get 404 instead of 403 when accessing an org I do not belong to?**

A: By design. Returning 404 prevents leaking information about which organization slugs exist. Users cannot discover valid organizations through error responses.

**Q: How do I use subdomain-based multi-tenancy?**

A: Use the subdomain middleware in your route group:

```ruby
Lumina.configure do |c|
  c.route_group :tenant, prefix: '', middleware: [ResolveOrganizationFromSubdomain], models: :all
  c.multi_tenant = { organization_identifier_column: 'slug' }
end
```

Then requests like `https://acme-corp.yourapp.com/api/posts` will resolve the organization from the subdomain. Common subdomains (`www`, `app`, `api`, `localhost`) are automatically skipped.

**Q: How do I make some endpoints public (no auth)?**

A: Use a `:public` route group:

```ruby
Lumina.configure do |c|
  c.route_group :public, prefix: 'public', middleware: [], models: [:materials]
end
```

---

## Real-World Examples

### Example 1: Complete Multi-Tenant Setup from Scratch

```ruby
# 1. Config (config/initializers/lumina.rb)
Lumina.configure do |c|
  c.model :posts, 'Post'
  c.model :comments, 'Comment'

  c.route_group :tenant, prefix: ':organization', middleware: [ResolveOrganizationFromRoute], models: :all

  c.multi_tenant = { organization_identifier_column: 'slug' }
end
```

```ruby
# 2. Model (app/models/post.rb)
class Post < Lumina::LuminaModel
  include Lumina::BelongsToOrganization
  include Lumina::HasAuditTrail
  include Discard::Model

  lumina_filters :status, :user_id
  lumina_sorts :created_at, :title
  lumina_default_sort '-created_at'
  lumina_includes :user, :comments
  lumina_search :title, :content

  validates :title, length: { maximum: 255 }, allow_nil: true
  validates :status, inclusion: { in: %w[draft published] }, allow_nil: true

  belongs_to :user
  has_many :comments
end
```

```ruby
# 3. Seed roles (db/seeds.rb)
Role.create!(name: 'Admin', slug: 'admin', permissions: ['*'])
Role.create!(name: 'Editor', slug: 'editor', permissions: [
  'posts.index', 'posts.show', 'posts.store', 'posts.update',
  'comments.*',
])
Role.create!(name: 'Viewer', slug: 'viewer', permissions: [
  'posts.index', 'posts.show',
  'comments.index', 'comments.show',
])
```

```ruby
# 4. Create organization and assign users
org = Organization.create!(name: 'Acme Corp', slug: 'acme-corp')

UserRole.create!(
  user_id: admin.id,
  organization_id: org.id,
  role_id: Role.find_by(slug: 'admin').id
)

UserRole.create!(
  user_id: editor.id,
  organization_id: org.id,
  role_id: Role.find_by(slug: 'editor').id
)
```

```bash
# 5. Use the API
# Admin: full access
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  -X POST /api/acme-corp/posts \
  -d '{"title": "Hello", "content": "World", "status": "published"}'
# -> 201 Created

# Editor: can create but cannot set all fields (depends on policy)
curl -H "Authorization: Bearer EDITOR_TOKEN" \
  -X POST /api/acme-corp/posts \
  -d '{"title": "Hello", "content": "World"}'
# -> 201 Created

# Viewer: cannot create
curl -H "Authorization: Bearer VIEWER_TOKEN" \
  -X POST /api/acme-corp/posts \
  -d '{"title": "Hello", "content": "World"}'
# -> 403 Forbidden
```

### Example 2: Nested Ownership Chain

```ruby
# Blog has organization_id directly
class Blog < Lumina::LuminaModel
  include Lumina::BelongsToOrganization
  belongs_to :organization
  has_many :posts
end

# Post reaches organization through blog (auto-detected via belongs_to)
class Post < Lumina::LuminaModel
  include Lumina::BelongsToOrganization
  belongs_to :blog
  has_many :comments
end

# Comment reaches organization through post -> blog (auto-detected via belongs_to)
class Comment < Lumina::LuminaModel
  include Lumina::BelongsToOrganization
  belongs_to :post
end
```

All three models are correctly scoped to the organization without each needing a direct `organization_id` column.
