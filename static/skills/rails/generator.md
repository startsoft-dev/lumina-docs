# Lumina Rails Server — Generator (Skill)

You are a senior software engineer specialized in **Lumina**, a Rails gem that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **Rails (Ruby)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's interactive CLI generator commands: `rails lumina:install` for initial project setup, `rails lumina:generate` (alias `lumina:g`) for scaffolding models, policies, and scopes, `rails lumina:export_postman` for generating Postman collections, and `rails invitation:link` for creating test invitation links. Includes supported column types and generated file examples.

---

## Documentation

### Commands Overview

| Command | Alias | Description |
|---|---|---|
| `rails lumina:install` | -- | Interactive project setup |
| `rails lumina:generate` | `rails lumina:g` | Scaffold resources (models, policies, scopes) |
| `rails lumina:export_postman` | -- | Generate Postman collection |
| `rails invitation:link` | -- | Generate invitation link for testing |

### lumina:install

Interactive installer that sets up the entire Lumina framework:

```bash
rails lumina:install
```

The installer walks you through:

**1. Core Setup**
- Creates `config/initializers/lumina.rb`
- Sets up route configuration

**2. Feature Selection**
- **Multi-tenant support** -- creates organizations, roles, user_roles tables, and middleware
- **Audit trail** -- creates audit_logs migration

**3. Multi-Tenant Options (if enabled)**
- **Resolution strategy**: route prefix vs subdomain
- **Organization identifier**: `id`, `slug`, or `uuid`
- **Default roles**: creates seeder with admin, editor, viewer roles

**4. Post-Setup**
- Optionally runs migrations
- Optionally seeds the database
- Prints remaining manual steps

### lumina:generate

Interactively scaffold resources:

```bash
rails lumina:generate
# or
rails lumina:g
```

#### Generating a Model

The generator walks you through defining columns interactively:

```
+ Lumina :: Generate :: Scaffold your resources +

 What type of resource would you like to generate?
 > Model (with migration and factory)

 What is the resource name?
 > BlogPost

 Define your columns:

 Column name: title
 Column type: string
 Nullable? No
 Has index? No

 Column name: content
 Column type: text
 Nullable? No

 Column name: status
 Column type: string
 Default value: draft

 Column name: user_id
 Column type: references

 Column name: published_at
 Column type: datetime
 Nullable? Yes

 Add another column? No

 Creating BlogPost model, migration, and factory .............. done
```

This generates:

**Model** (`app/models/blog_post.rb`):

```ruby
class BlogPost < Lumina::LuminaModel
  # Validation (ActiveModel -- use allow_nil: true)
  validates :title, length: { maximum: 255 }, allow_nil: true
  validates :user_id, numericality: { only_integer: true }, allow_nil: true

  # Field permissions are controlled by the policy.
  # See: app/policies/blog_post_policy.rb

  lumina_filters  :status, :user_id
  lumina_sorts    :created_at, :title
  lumina_default_sort '-created_at'
  lumina_includes :user
  lumina_search   :title, :content

  belongs_to :user
end
```

**Migration** (`db/migrate/xxxx_create_blog_posts.rb`):

```ruby
class CreateBlogPosts < ActiveRecord::Migration[8.0]
  def change
    create_table :blog_posts do |t|
      t.string :title, null: false
      t.text :content, null: false
      t.string :status, default: 'draft'
      t.references :user, null: false, foreign_key: true
      t.datetime :published_at
      t.datetime :discarded_at
      t.timestamps
    end

    add_index :blog_posts, :discarded_at
  end
end
```

**Factory** (`spec/factories/blog_posts.rb` or `test/factories/blog_posts.rb`):

```ruby
FactoryBot.define do
  factory :blog_post do
    title { Faker::Lorem.sentence }
    content { Faker::Lorem.paragraphs(number: 3).join("\n\n") }
    status { %w[draft published].sample }
    association :user
    published_at { [nil, Faker::Time.backward(days: 30)].sample }
  end
end
```

**Auto-registration** in `config/initializers/lumina.rb`:

```ruby
Lumina.configure do |c|
  c.model :'blog-posts', 'BlogPost'
end
```

#### Generating a Policy

```bash
rails lumina:generate
# Select: Policy
# Resource name: BlogPost
```

Generates `app/policies/blog_post_policy.rb`:

```ruby
class BlogPostPolicy < Lumina::ResourcePolicy
  self.resource_slug = 'blog-posts'

  # All CRUD methods inherited from ResourcePolicy
  # Override for custom authorization logic

  # Attribute Permissions -- override to control field access:
  # def permitted_attributes_for_create(user)
  #   has_role?(user, 'admin') ? ['*'] : ['title', 'content']
  # end
end
```

#### Generating a Scope

```bash
rails lumina:generate
# Select: Scope
# Resource name: BlogPost
```

Generates `app/models/model_scopes/blog_post_scope.rb`:

```ruby
module ModelScopes
  class BlogPostScope
    def self.apply(scope)
      # Add your global scope logic
      # e.g., scope.where(is_visible: true)
      scope
    end
  end
end
```

If the model uses the `Lumina::HasAutoScope` concern (included in `Lumina::LuminaModel` by default), this scope is automatically applied.

### Supported Column Types

| Type | Migration | Factory | Example |
|---|---|---|---|
| `string` | `t.string :name` | `Faker::Lorem.sentence` | Titles, slugs, emails |
| `text` | `t.text :body` | `Faker::Lorem.paragraphs(number: 3).join` | Long content |
| `integer` | `t.integer :count` | `Faker::Number.between(from: 0, to: 100)` | Counts, quantities |
| `boolean` | `t.boolean :active` | `Faker::Boolean.boolean` | Flags, toggles |
| `date` | `t.date :published_at` | `Faker::Date.backward(days: 30)` | Dates without time |
| `datetime` | `t.datetime :starts_at` | `Faker::Time.backward(days: 30)` | Dates with time |
| `decimal` | `t.decimal :price, precision: 10, scale: 2` | `Faker::Commerce.price` | Prices, amounts |
| `uuid` | `t.uuid :external_id` | `SecureRandom.uuid` | External IDs |
| `references` | `t.references :user, foreign_key: true` | `association :user` | Relationships |

### lumina:export_postman

Generate a complete Postman Collection v2.1 for all registered models:

```bash
rails lumina:export_postman
```

This creates a JSON file you can import directly into Postman. The collection includes:

- All CRUD endpoints for every registered model
- Soft delete endpoints (trashed, restore, force-delete)
- Authentication endpoints (login, logout, register)
- Invitation endpoints (if multi-tenant)
- Nested operations endpoint
- Pre-configured authorization headers
- Example request bodies with validation rules

Configuration:

```ruby
Lumina.configure do |c|
  c.postman = {
    role_class:      'Role',
    user_role_class: 'UserRole',
    user_class:      'User',
  }
end
```

### invitation:link

Generate an invitation link for testing:

```bash
rails invitation:link user@example.com acme-corp
```

Options:

```bash
rails invitation:link user@example.com acme-corp --role=editor --create
```

| Option | Description |
|---|---|
| `--role=ROLE` | The role slug to assign (default: first available role) |
| `--create` | Create the organization if it does not exist |

Creates a new invitation and outputs the acceptance URL. Useful for testing the invitation flow without sending emails.

---

## Frequently Asked Questions

**Q: How do I scaffold a new model quickly?**

A: Run `rails lumina:generate` (or `rails lumina:g`), select "Model", name it, and define columns interactively. It creates the model, migration, and factory -- and auto-registers it in the initializer.

**Q: What is the difference between `lumina:install` and `lumina:generate`?**

A: `lumina:install` sets up the entire framework (initializer, routes, multi-tenancy, audit trail). You run it once. `lumina:generate` scaffolds individual resources (models, policies, scopes) -- you run it whenever you need a new resource.

**Q: Can I generate just a policy without a model?**

A: Yes. Run `rails lumina:generate`, select "Policy", and enter the model name. It creates a policy extending `Lumina::ResourcePolicy` with the correct resource slug.

**Q: How do I export my API for Postman?**

A: Run `rails lumina:export_postman`. It generates a JSON file you can import directly into Postman with all endpoints, auth headers, and example bodies.

**Q: What test framework does the generator use?**

A: It generates FactoryBot factories by default. The factory location depends on the test framework selected during `lumina:install` -- `spec/factories/` for RSpec or `test/factories/` for Minitest.

**Q: How do I generate a test invitation link?**

A: Run `rails invitation:link user@example.com acme-corp --role=editor --create`. It creates an invitation record and outputs the URL -- no email needed.

**Q: Does the generator auto-register the model in the config?**

A: Yes. When generating a model, it automatically adds a `c.model :'model-slug', 'ModelClass'` entry to `config/initializers/lumina.rb`.

---

## Real-World Examples

### Example 1: Scaffolding a Complete Blog Feature

```bash
# 1. Generate the model with migration and factory
rails lumina:g
# -> Select Model, name: "BlogPost"
# -> Columns: title (string), content (text), status (string, default: draft),
#             user_id (references), published_at (datetime, nullable)

# 2. Generate the policy
rails lumina:g
# -> Select Policy, name: "BlogPost"

# 3. Generate a custom scope (optional)
rails lumina:g
# -> Select Scope, name: "BlogPost"

# 4. Run migrations
rails db:migrate

# 5. Export Postman collection to test
rails lumina:export_postman
```

You now have:
- `app/models/blog_post.rb` -- model with validation, filters, sorts
- `db/migrate/xxxx_create_blog_posts.rb` -- migration
- `spec/factories/blog_posts.rb` -- FactoryBot factory with Faker
- `app/policies/blog_post_policy.rb` -- policy with `Lumina::ResourcePolicy` base
- `app/models/model_scopes/blog_post_scope.rb` -- custom scope via `ModelScopes::BlogPostScope`
- Blog post auto-registered in `config/initializers/lumina.rb`
- Full Postman collection for API testing

### Example 2: Generating an Invitation Link

```bash
# Generate a link for a new editor on acme-corp
rails invitation:link editor@company.com acme-corp --role=editor --create
# -> Invitation created!
# -> Acceptance URL: https://yourapp.com/invitations/accept?token=abc123...

# Generate a link for an existing user
rails invitation:link existing@company.com acme-corp --role=admin
# -> Invitation created!
# -> Acceptance URL: https://yourapp.com/invitations/accept?token=def456...
```

### Example 3: Full Project Setup from Scratch

```bash
# 1. Create a new Rails app
rails new my-api --api

# 2. Add Lumina
bundle add lumina-rails

# 3. Run the interactive installer
rails lumina:install
# -> Enable multi-tenancy: Yes
# -> Enable audit trail: Yes
# -> Organization identifier: slug
# -> Run migrations: Yes
# -> Seed database: Yes

# 4. Generate your first model
rails lumina:g
# -> Model: Post (title:string, content:text, status:string, user_id:references)

# 5. Generate the policy
rails lumina:g
# -> Policy: Post

# 6. Run migrations
rails db:migrate

# 7. Start the server
rails server
```

Your API is now live with full CRUD, validation, authorization, multi-tenancy, and audit trail.
