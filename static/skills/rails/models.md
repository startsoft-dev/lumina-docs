# Lumina Rails Server — Models (Skill)

You are a senior software engineer specialized in **Lumina**, a Rails gem that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **Rails (Ruby)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina model definitions: the `Lumina::LuminaModel` base class, available concerns (`Lumina::HasLumina`, `Lumina::HasValidation`, `Lumina::BelongsToOrganization`, `Lumina::HasAuditTrail`, `Lumina::HasUuid`, `Lumina::HasPermissions`, `Lumina::HidableColumns`, `Lumina::HasAutoScope`), the full DSL reference for configuring filters, sorts, search, pagination, middleware, and route exclusion, as well as model registration and relationships.

---

## Documentation

### LuminaModel Base Class

The recommended way to create Lumina models is to extend `Lumina::LuminaModel` -- a convenience base class that pre-includes all the core concerns:

```ruby
class Post < Lumina::LuminaModel
  lumina_filters :status, :user_id
  lumina_sorts :created_at, :title
  lumina_search :title, :content

  validates :title, length: { maximum: 255 }, allow_nil: true
  validates :status, inclusion: { in: %w[draft published] }, allow_nil: true
end
```

`Lumina::LuminaModel` extends `ApplicationRecord` and includes these concerns automatically:

| Concern | Purpose |
|---|---|
| `Lumina::HasLumina` | Query builder DSL (filters, sorts, includes, etc.) |
| `Lumina::HasValidation` | Role-based field allowlisting and validation |
| `Lumina::HidableColumns` | Dynamic column hiding from API responses |
| `Lumina::HasAutoScope` | Auto-discovery of `ModelScopes::{Model}Scope` classes |

You can also extend `ApplicationRecord` directly and include concerns manually if you prefer full control. `Lumina::LuminaModel` is a convenience, not a requirement.

### Optional Concerns

These concerns are **not** included in `Lumina::LuminaModel` because they require additional database columns, gems, or relationships. Add them manually when needed:

```ruby
class Post < Lumina::LuminaModel
  include Lumina::HasAuditTrail
  include Lumina::BelongsToOrganization
  include Discard::Model  # Soft deletes via discard gem
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

```bash
rails lumina:install --publish-model
```

This creates `app/models/lumina_model.rb` in your project:

```ruby
# app/models/lumina_model.rb
class LuminaModel < Lumina::LuminaModel
  include Lumina::HasAuditTrail  # Now all models get audit trail
end
```

### Model Configuration DSL

Below is a complete model example demonstrating **all** available DSL methods:

```ruby
class Post < Lumina::LuminaModel
  include Lumina::HasAuditTrail
  include Lumina::BelongsToOrganization
  include Discard::Model

  # -- Query Builder --
  lumina_filters   :status, :user_id, :category_id
  lumina_sorts     :created_at, :title, :updated_at
  lumina_default_sort '-created_at'
  lumina_fields    :id, :title, :content, :status
  lumina_includes  :user, :comments, :tags
  lumina_search    :title, :content

  # -- Pagination --
  lumina_pagination_enabled true
  lumina_per_page 25

  # -- Middleware --
  lumina_middleware 'throttle:60,1'
  lumina_middleware_actions(
    store:   ['verified'],
    destroy: ['admin']
  )

  # -- Route Exclusion --
  lumina_except_actions :destroy

  # -- Relationships --
  belongs_to :user
  belongs_to :blog
  has_many :comments
  has_many :tags
end
```

### DSL Reference

| DSL Method | Type | Description |
|---|---|---|
| `lumina_filters` | `*symbols` | Fields available for query-string filtering via `?filter[field]=value`. |
| `lumina_sorts` | `*symbols` | Fields available for sorting via `?sort=field`. Prefix with `-` for descending. |
| `lumina_default_sort` | `string` | The sort applied when no `?sort` parameter is provided. Use `-` prefix for descending. |
| `lumina_fields` | `*symbols` | Fields that can be selected via sparse fieldsets (`?fields[model]=field1,field2`). |
| `lumina_includes` | `*symbols` | Relationships that can be eager-loaded via `?include=relation`. |
| `lumina_search` | `*symbols/strings` | Fields searched when `?search=term` is used. Case-insensitive `LIKE`. Supports dot-notation for relationships (e.g., `'user.name'`). |
| `lumina_pagination_enabled` | `bool` | Enables or disables pagination. Defaults to `false`. |
| `lumina_per_page` | `integer` | Number of records per page. Defaults to `25`. |
| `lumina_middleware` | `*strings` | Middleware applied to **all** routes for this model. |
| `lumina_middleware_actions` | `hash` | Middleware applied to **specific** actions only. Keys: `:index`, `:show`, `:store`, `:update`, `:destroy`. |
| `lumina_except_actions` | `*symbols` | CRUD actions to exclude from route generation (`:index`, `:show`, `:store`, `:update`, `:destroy`). |

You only need to declare DSL methods that differ from their defaults.

### Concern Details

**HasLumina** -- The core concern providing all query-related DSL methods. It sets up class attributes for filters, sorts, includes, fields, search, pagination, middleware, and more. Included in `LuminaModel` automatically. Also provides `uses_soft_deletes?` to detect `discarded_at` or `deleted_at` columns.

**HasValidation** -- Adds format validation. Lumina calls `validate_for_action()` automatically during `store` and `update`. Format constraints use standard ActiveModel `validates` declarations. Field permissions (which fields each role can set) are defined on the policy.

**HasPermissions** -- Adds role-based permission checking to the User model:

```ruby
class User < Lumina::LuminaModel
  include Lumina::HasPermissions
  has_many :user_roles
end

user.has_permission?('posts.store', organization)   # true/false
user.has_permission?('*', organization)             # wildcard: full access
user.has_permission?('posts.*', organization)       # all post actions
```

Permission format: `{resource_slug}.{action}` (e.g., `posts.index`, `blogs.update`). Wildcards: `*` = everything, `posts.*` = all actions on posts.

**HasAuditTrail** -- Automatically records changes to your model. Tracks events: `created`, `updated`, `deleted`, `force_deleted`, `restored`. Exclude fields with `lumina_audit_exclude`:

```ruby
class User < Lumina::LuminaModel
  include Lumina::HasAuditTrail
  lumina_audit_exclude :password, :remember_token, :api_token
end
```

**HasUuid** -- Auto-generates a UUID on creation. Requires a `uuid` column in the database:

```ruby
class Invoice < Lumina::LuminaModel
  include Lumina::HasUuid
  # No additional configuration needed.
end
```

Your migration must include the `uuid` column:

```ruby
t.uuid :uuid, null: true
add_index :invoices, :uuid, unique: true
```

**BelongsToOrganization** -- Multi-tenant organization scoping. Automatically filters queries to the current organization and sets `organization_id` on creation. Adds a `belongs_to :organization` association, a `for_organization(org)` class method, and a default scope:

```ruby
class Post < Lumina::LuminaModel
  include Lumina::BelongsToOrganization
end

# For nested models without a direct organization_id:
# Lumina auto-detects the path: Comment -> post -> blog -> organization
class Comment < Lumina::LuminaModel
  include Lumina::BelongsToOrganization
  belongs_to :post
end
```

**HidableColumns** -- Controls column visibility in API responses across three layers:

1. **Base hidden** (always): `password`, `password_digest`, `remember_token`, `created_at`, `updated_at`, `deleted_at`, `discarded_at`, `email_verified_at`
2. **Model-level** via `lumina_additional_hidden`: additional fields to always hide
3. **Policy-level** via `hidden_attributes_for_show()` / `permitted_attributes_for_show()`: per-user dynamic hiding

```ruby
class User < Lumina::LuminaModel
  lumina_additional_hidden :api_token, :stripe_id
end
```

**HasAutoScope** -- Automatically applies a global scope from `ModelScopes::{ModelName}Scope`:

```ruby
# app/models/model_scopes/post_scope.rb
module ModelScopes
  class PostScope
    def self.apply(scope)
      scope.where(is_visible: true)
    end
  end
end
```

The scope is only applied if the class exists. You can safely include the concern without creating the scope class until you need it.

### Model Registration

Models are registered in `config/initializers/lumina.rb`. The key becomes the URL slug and permission prefix:

```ruby
Lumina.configure do |c|
  c.model :'blog-posts', 'BlogPost'
  c.model :comments, 'Comment'
  c.model :categories, 'Category'
end
```

This generates routes like `GET /api/{organization}/blog-posts`, `POST /api/{organization}/blog-posts`, etc. The model key (e.g., `blog-posts`) is used as the permission prefix, so make sure it matches what you use in your role permission definitions (e.g., `blog-posts.store`).

---

## Frequently Asked Questions

**Q: What does `Lumina::LuminaModel` give me out of the box?**

A: It extends `ApplicationRecord` and includes four core concerns automatically:

```ruby
class Post < Lumina::LuminaModel
  # Already included:
  # - Lumina::HasLumina       (query builder DSL)
  # - Lumina::HasValidation   (validation support)
  # - Lumina::HidableColumns  (column hiding)
  # - Lumina::HasAutoScope    (auto scope discovery)
end
```

You add optional concerns like `Lumina::HasAuditTrail`, `Lumina::BelongsToOrganization`, `Lumina::HasUuid`, or `Discard::Model` manually when needed.

**Q: Why must every validation use `allow_nil: true`?**

A: Lumina validation runs on `Model.new(params)`. Without `allow_nil: true`, nil attributes on partial updates would fail validation. The `allow_nil: true` pattern ensures that only submitted fields are validated. Presence requirements are handled by the policy's field permissions, not model validations.

```ruby
validates :title, length: { maximum: 255 }, allow_nil: true   # correct
validates :title, length: { maximum: 255 }                    # will break partial updates
```

**Q: How do I hide sensitive columns from API responses?**

A: Use `lumina_additional_hidden` on the model for columns that should always be hidden. For per-user dynamic hiding, use the policy's `hidden_attributes_for_show` and `permitted_attributes_for_show` methods:

```ruby
class User < Lumina::LuminaModel
  lumina_additional_hidden :api_token, :stripe_id
end
```

**Q: How do I exclude certain CRUD actions from being generated?**

A: Use `lumina_except_actions`:

```ruby
class AuditLog < Lumina::LuminaModel
  lumina_except_actions :store, :update, :destroy  # read-only resource
end
```

Valid values: `:index`, `:show`, `:store`, `:update`, `:destroy`.

**Q: How do I add a global scope to all queries for a model?**

A: Create a scope class following the naming convention and `Lumina::HasAutoScope` (included in `LuminaModel`) will apply it automatically:

```ruby
# app/models/model_scopes/post_scope.rb
module ModelScopes
  class PostScope
    def self.apply(scope)
      scope.where(is_visible: true)
    end
  end
end
```

No additional configuration is needed. Every query for `Post` will automatically include `WHERE is_visible = true`.

**Q: Can I extend `ApplicationRecord` instead of `Lumina::LuminaModel`?**

A: Yes. `Lumina::LuminaModel` is a convenience, not a requirement. You can include the concerns manually:

```ruby
class Post < ApplicationRecord
  include Lumina::HasLumina
  include Lumina::HasValidation
  include Lumina::HidableColumns
  include Lumina::HasAutoScope
  # ... your DSL configuration
end
```

---

## Real-World Examples

### Example 1: Full-Featured Blog Post Model

```ruby
# app/models/blog_post.rb
class BlogPost < Lumina::LuminaModel
  include Lumina::HasAuditTrail
  include Lumina::HasUuid
  include Lumina::BelongsToOrganization
  include Discard::Model

  # -- Validation --
  validates :title, length: { maximum: 255 }, allow_nil: true
  validates :slug, length: { maximum: 255 }, allow_nil: true
  validates :content, length: { maximum: 50_000 }, allow_nil: true
  validates :excerpt, length: { maximum: 500 }, allow_nil: true
  validates :status, inclusion: { in: %w[draft published archived] }, allow_nil: true

  # -- Query Configuration --
  lumina_filters   :status, :user_id, :category_id
  lumina_sorts     :created_at, :title, :published_at
  lumina_default_sort '-published_at'
  lumina_includes  :user, :category, :comments, :tags
  lumina_search    :title, :content, :excerpt
  lumina_fields    :id, :title, :slug, :excerpt, :status, :published_at

  # -- Pagination --
  lumina_pagination_enabled true
  lumina_per_page 20

  # -- Relationships --
  belongs_to :user
  belongs_to :category
  has_many :comments
  has_and_belongs_to_many :tags
end
```

This single model definition gives you REST endpoints, filtering, sorting, full-text search, eager loading, sparse fieldsets, pagination, validation, audit logging, UUID generation, organization scoping, and column hiding.

### Example 2: Read-Only Reference Data Model

```ruby
# app/models/material.rb
class Material < Lumina::LuminaModel
  validates :name, length: { maximum: 255 }, allow_nil: true
  validates :unit, inclusion: { in: %w[kg ton m3 piece] }, allow_nil: true

  lumina_filters :unit
  lumina_sorts :name
  lumina_default_sort 'name'
  lumina_search :name

  lumina_except_actions :store, :update, :destroy  # read-only
  lumina_pagination_enabled true
  lumina_per_page 50
end
```

Register it in a `:public` route group for unauthenticated access to reference data.

### Example 3: Nested Model with Organization Scoping via Owner Chain

```ruby
# app/models/comment.rb
class Comment < Lumina::LuminaModel
  include Lumina::BelongsToOrganization
  include Lumina::HasAuditTrail

  # Comment does not have organization_id directly.
  # It belongs to a Post, which belongs to a Blog, which has organization_id.
  # Lumina auto-detects the ownership path via belongs_to relationships.

  validates :content, length: { maximum: 5000 }, allow_nil: true

  lumina_filters :post_id, :user_id
  lumina_sorts :created_at
  lumina_default_sort '-created_at'
  lumina_includes :post, :user
  lumina_search :content

  belongs_to :post
  belongs_to :user
end
```

Lumina traverses `Comment -> post -> blog` to find the organization, ensuring comments are correctly scoped without needing a direct `organization_id` column.
