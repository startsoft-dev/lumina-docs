---
sidebar_position: 7
title: Multi-Tenancy
---

# Multi-Tenancy

Lumina supports organization-based data isolation out of the box. Each user can belong to multiple organizations with different roles in each.

## Enabling Multi-Tenancy

During `rails lumina:install`, select **Yes** when asked about multi-tenant support. This creates:

- `organizations` table and model
- `roles` table and model
- `user_roles` junction table
- Organization resolution middleware
- Role and organization seeders

Or configure it manually in `config/initializers/lumina.rb`:

```ruby
Lumina.configure do |c|
  c.multi_tenant[:enabled] = true
  c.multi_tenant[:use_subdomain] = false                    # false = URL prefix, true = subdomain
  c.multi_tenant[:organization_identifier_column] = 'slug'  # 'id', 'slug', or 'uuid'
  c.multi_tenant[:middleware] = nil                          # Custom middleware class (optional)
end
```

## How It Works

When multi-tenancy is enabled, all API routes include the organization:

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

## Organization Resolution Strategies

### Route Prefix (Default)

The organization identifier is part of the URL path:

```bash
GET /api/acme-corp/posts       # Using slug
GET /api/1/posts               # Using id
GET /api/abc-123-def/posts     # Using uuid
```

Uses `Lumina::Middleware::ResolveOrganizationFromRoute`. The identifier column is configurable:

```ruby
c.multi_tenant[:organization_identifier_column] = 'slug'  # matches organizations.slug column
```

### Subdomain

The organization is extracted from the subdomain:

```bash
GET https://acme-corp.yourapp.com/api/posts
GET https://other-org.yourapp.com/api/posts
```

Uses `Lumina::Middleware::ResolveOrganizationFromSubdomain`. Enable it:

```ruby
Lumina.configure do |c|
  c.multi_tenant[:enabled] = true
  c.multi_tenant[:use_subdomain] = true
end
```

:::info Skipped Subdomains
The subdomain middleware automatically skips these common subdomains: `www`, `app`, `api`, `localhost`, `127.0.0.1`. Requests from these are treated as non-tenant.
:::

## Scoping Models

Add `BelongsToOrganization` to scope a model's data per organization:

```ruby
class Post < ApplicationRecord
  include Lumina::HasLumina
  include Lumina::HasValidation
  include Lumina::BelongsToOrganization

  has_discard
end
```

Migration:

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

Not all models have a direct `organization_id` column. For nested models, use the `lumina_owner` DSL to define the path to the organization:

```ruby
class Comment < ApplicationRecord
  include Lumina::HasLumina
  include Lumina::BelongsToOrganization

  # Comment → Post → Blog → Organization
  lumina_owner 'post.blog'

  belongs_to :post
end
```

```ruby
class Post < ApplicationRecord
  include Lumina::HasLumina
  include Lumina::BelongsToOrganization

  # Post → Blog → Organization
  lumina_owner 'blog'

  belongs_to :blog
  has_many :comments
end
```

```ruby
class Blog < ApplicationRecord
  include Lumina::BelongsToOrganization

  # Blog has organization_id directly — no lumina_owner needed

  belongs_to :organization
  has_many :posts
end
```

## Per-Organization Roles

Users have roles scoped to each organization. A user can be **admin** in one organization and **viewer** in another.

### Setting Up Roles

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

### Assigning Users to Organizations

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

### Checking Permissions

```ruby
# User is admin in Acme Corp
user.has_permission?('posts.store', acme_corp)   # true
user.has_permission?('posts.destroy', acme_corp)  # true (admin has *)

# Same user is viewer in Other Org
user.has_permission?('posts.store', other_org)   # false
user.has_permission?('posts.index', other_org)   # true
```

## Access Control

### User Not in Organization

If a user tries to access an organization they don't belong to:

```bash
curl -H "Authorization: Bearer TOKEN" /api/other-org/posts
# → 404 { "message": "Organization not found" }
```

:::info Why 404 and not 403?
Returning 404 instead of 403 prevents leaking information about organization existence. Users can't discover which organization slugs are valid.
:::

### No Authentication

Requests without authentication to non-public endpoints:

```bash
curl /api/acme-corp/posts
# → 401 { "message": "Unauthenticated." }
```

### Public Endpoints

Models listed in the `public_model` config skip authentication:

```ruby
# config/initializers/lumina.rb
Lumina.configure do |c|
  c.public_model :posts  # /api/{org}/posts doesn't require auth
end
```

## Full Setup Example

Here's a complete multi-tenant setup from scratch:

### 1. Enable in Config

```ruby
# config/initializers/lumina.rb
Lumina.configure do |c|
  c.model :posts, 'Post'
  c.model :comments, 'Comment'

  c.multi_tenant[:enabled] = true
  c.multi_tenant[:organization_identifier_column] = 'slug'
end
```

### 2. Create Models

```ruby
# app/models/post.rb
class Post < ApplicationRecord
  include Lumina::HasLumina
  include Lumina::HasValidation
  include Lumina::BelongsToOrganization
  include Lumina::HasAuditTrail

  has_discard

  lumina_filters  :status, :user_id
  lumina_sorts    :created_at, :title
  lumina_default_sort '-created_at'
  lumina_includes :user, :comments
  lumina_search   :title, :content

  lumina_validation_rules(
    title:   'string|max:255',
    content: 'string',
    status:  'string|in:draft,published'
  )

  lumina_store_rules(
    admin:  { title: :required, content: :required, status: :nullable },
    editor: { title: :required, content: :required },
    '*':    { title: :required, content: :required }
  )

  belongs_to :user
  has_many :comments
end
```

### 3. Seed Roles

```ruby
# db/seeds.rb
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

### 4. Create Organization & Assign Users

```ruby
org = Organization.create!(name: 'Acme Corp', slug: 'acme-corp')

# Admin user
UserRole.create!(
  user_id: admin.id,
  organization_id: org.id,
  role_id: Role.find_by(slug: 'admin').id
)

# Editor user
UserRole.create!(
  user_id: editor.id,
  organization_id: org.id,
  role_id: Role.find_by(slug: 'editor').id
)
```

### 5. Use the API

```bash
# Admin: full access
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  -X POST /api/acme-corp/posts \
  -d '{"title": "Hello", "content": "World", "status": "published"}'
# → 201 Created

# Editor: can create but not set status (role-based validation)
curl -H "Authorization: Bearer EDITOR_TOKEN" \
  -X POST /api/acme-corp/posts \
  -d '{"title": "Hello", "content": "World"}'
# → 201 Created

# Viewer: cannot create
curl -H "Authorization: Bearer VIEWER_TOKEN" \
  -X POST /api/acme-corp/posts \
  -d '{"title": "Hello", "content": "World"}'
# → 403 Forbidden
```
