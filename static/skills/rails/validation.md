# Lumina Rails Server — Validation (Skill)

You are a senior software engineer specialized in **Lumina**, a Rails gem that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **Rails (Ruby)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's automatic validation system: defining format rules on models using standard ActiveModel `validates` declarations, the critical `allow_nil: true` pattern, field permissions via policies (`permitted_attributes_for_create` and `permitted_attributes_for_update`), the error response format, and how the 403 vs 422 distinction works.

---

## Documentation

### How Validation Works

Models opt into validation by including the `Lumina::HasValidation` concern (automatically included in `Lumina::LuminaModel`). You define format rules on the model and field permissions on the policy.

When a request hits a `store` or `update` endpoint, Lumina:

1. Checks the policy's `permitted_attributes_for_create(user)` or `permitted_attributes_for_update(user)` to see which fields the user is allowed to set
2. If the request contains forbidden fields, returns a `403 Forbidden` response
3. Runs ActiveModel validations on the permitted fields
4. On failure, returns a `422 Unprocessable Entity` response with field-level errors
5. On success, proceeds with the operation using only the validated fields

```ruby
class Post < Lumina::LuminaModel
  # Format rules -- type and constraint validation
  validates :title, length: { maximum: 255 }, allow_nil: true
  validates :status, inclusion: { in: %w[draft published archived] }, allow_nil: true

  # Which fields each role can create or update is defined on the policy.
  # See the Policies skill for details on attribute permissions.
end
```

Validation runs automatically. You do not need to call any validation method yourself -- Lumina intercepts the request before the data reaches your model.

### Model-Level Validation (ActiveModel)

Use standard Rails `validates` declarations for type and format constraints. These are the same validators you already know from Rails:

```ruby
validates :title, length: { maximum: 255 }, allow_nil: true
validates :content, length: { maximum: 10_000 }, allow_nil: true
validates :status, inclusion: { in: %w[draft published archived] }, allow_nil: true
validates :user_id, numericality: { only_integer: true }, allow_nil: true
validates :is_published, inclusion: { in: [true, false] }, allow_nil: true
validates :rating, numericality: { greater_than: 0, less_than_or_equal_to: 5 }, allow_nil: true
```

Any standard ActiveModel validator works: `length`, `numericality`, `inclusion`, `exclusion`, `format`, `uniqueness`, and so on.

**Critical: Why `allow_nil: true`?**

All validators **must** use `allow_nil: true`. This is essential because validation runs on a blank model instance (`Model.new`), not the actual record. Without `allow_nil: true`, fields that are simply not submitted would fail validation. Presence requirements are handled by the policy's field permissions, not here.

Keep model-level validators focused on **type and format constraints** (e.g., `length: { maximum: 255 }`). Field access control (who can set which fields) belongs in the policy.

### Field Permissions via Policy

Which fields are accepted on `store` and `update` is determined by the policy's `permitted_attributes_for_create(user)` and `permitted_attributes_for_update(user)` methods. This is where role-based field access lives.

```ruby
class PostPolicy < Lumina::ResourcePolicy
  self.resource_slug = 'posts'

  def permitted_attributes_for_create(user)
    if has_role?(user, 'admin')
      ['*']  # Admins can set any field
    else
      ['title', 'content']  # Others can only set title and content
    end
  end

  def permitted_attributes_for_update(user)
    if has_role?(user, 'admin')
      ['*']
    else
      ['title', 'content']
    end
  end
end
```

When a user submits fields they are not permitted to set, the API returns a **403 Forbidden**:

```json
{
    "message": "You are not allowed to set the following field(s): status, is_published"
}
```

If the permitted fields pass but fail format validation, the API returns a **422 Unprocessable Entity** with field-level errors.

### Error Response Format

When validation fails, the API returns a `422 Unprocessable Entity` response with field-level errors:

```json
{
    "errors": {
        "title": ["is too long (maximum is 255 characters)"],
        "status": ["is not included in the list"]
    }
}
```

Each key in the `errors` object corresponds to a field name, and the value is an array of error messages for that field. A single field can have multiple errors if it violates more than one rule.

### Difference Between 403 and 422

- **403 Forbidden**: The user tried to set a field they are not allowed to (field permission denied by policy)
- **422 Unprocessable Entity**: The field is allowed but the value failed format validation

### Custom Validation Messages

Use the standard Rails approach with the `message` option:

```ruby
validates :title, length: { maximum: 255, message: 'cannot exceed 255 characters' }, allow_nil: true
validates :status, inclusion: { in: %w[draft published archived], message: 'must be draft, published, or archived' }, allow_nil: true
```

Or use locale files at `config/locales/en.yml`:

```yaml
en:
  activerecord:
    errors:
      models:
        post:
          attributes:
            title:
              too_long: "Post title cannot exceed %{count} characters."
            status:
              inclusion: "Status must be draft, published, or archived."
```

---

## Frequently Asked Questions

**Q: How do I add validation to a model?**

A: Use standard ActiveModel `validates` with `allow_nil: true`:

```ruby
class Post < Lumina::LuminaModel
  validates :title, length: { maximum: 255 }, allow_nil: true
  validates :content, length: { maximum: 50_000 }, allow_nil: true
  validates :status, inclusion: { in: %w[draft published archived] }, allow_nil: true
end
```

Validation runs automatically on `store` and `update` -- no manual calls needed.

**Q: Why do I need `allow_nil: true` on every validation?**

A: Because Lumina validates using `Model.new(params)`. On partial updates, fields the user did not send will be `nil`. Without `allow_nil: true`, those nil fields would incorrectly fail validation. This is the single most important validation pattern in Lumina Rails.

**Q: How do I make different roles able to set different fields?**

A: Define field permissions in the policy, not the model:

```ruby
class PostPolicy < Lumina::ResourcePolicy
  self.resource_slug = 'posts'

  def permitted_attributes_for_create(user)
    if has_role?(user, 'admin')
      ['*']
    elsif has_role?(user, 'editor')
      ['title', 'content', 'excerpt', 'category_id']
    else
      ['title', 'content']
    end
  end

  def permitted_attributes_for_update(user)
    if has_role?(user, 'admin')
      ['*']
    elsif has_role?(user, 'editor')
      ['title', 'content', 'excerpt', 'category_id']
    else
      ['title', 'content']
    end
  end
end
```

The model's `validates` handles format validation; the policy handles who can write which fields.

**Q: What is the difference between 403 and 422 errors?**

A:
- **403 Forbidden**: The user tried to set a field they are not allowed to (e.g., a regular user trying to set `is_published`)
- **422 Unprocessable Entity**: The field is allowed but the value failed format validation (e.g., `status` is not one of the allowed values)

**Q: Can I use any ActiveModel validation?**

A: Yes. All standard Rails validations work: `presence`, `uniqueness` (with `scope`), `format` (with regex), `numericality`, `inclusion`, `exclusion`, `length`, `confirmation`, `acceptance`, and custom validators. Just remember to add `allow_nil: true`.

**Q: How do I add custom error messages?**

A: Either inline with the `message` option:

```ruby
validates :title, length: { maximum: 255, message: 'is too long (max 255 chars)' }, allow_nil: true
```

Or via Rails locale files at `config/locales/en.yml`.

**Q: What happens if I forget `allow_nil: true`?**

A: Partial updates will break. When a user sends only `{ "title": "New Title" }`, all other fields on the `Model.new` instance will be `nil`. Without `allow_nil: true`, validators on those nil fields will fail and return spurious 422 errors for fields the user never submitted.

---

## Real-World Examples

### Example 1: Complete Model + Policy with Role-Based Validation

```ruby
# app/models/post.rb
class Post < Lumina::LuminaModel
  belongs_to :user
  belongs_to :category
  has_many :comments, dependent: :destroy

  # Format rules: type and constraint validation
  validates :title, length: { maximum: 255 }, allow_nil: true
  validates :content, length: { maximum: 50_000 }, allow_nil: true
  validates :excerpt, length: { maximum: 500 }, allow_nil: true
  validates :status, inclusion: { in: %w[draft published archived] }, allow_nil: true
  validates :category_id, numericality: { only_integer: true }, allow_nil: true
  validates :is_published, inclusion: { in: [true, false] }, allow_nil: true
  validates :featured, inclusion: { in: [true, false] }, allow_nil: true
  validates :is_pinned, inclusion: { in: [true, false] }, allow_nil: true

  # Field permissions are controlled by the policy.

  lumina_filters :status, :user_id, :category_id
  lumina_sorts :created_at, :title, :published_at
  lumina_search :title, :content, :excerpt
end
```

```ruby
# app/policies/post_policy.rb
class PostPolicy < Lumina::ResourcePolicy
  self.resource_slug = 'posts'

  def permitted_attributes_for_create(user)
    if has_role?(user, 'admin')
      ['*']
    elsif has_role?(user, 'editor')
      ['title', 'content', 'excerpt', 'category_id']
    else
      ['title', 'content']
    end
  end

  def permitted_attributes_for_update(user)
    if has_role?(user, 'admin')
      ['*']
    elsif has_role?(user, 'editor')
      ['title', 'content', 'excerpt', 'category_id']
    else
      ['title', 'content']
    end
  end
end
```

**Result:**

| Action | Admin | Editor | Default |
|--------|-------|--------|---------|
| **Create** | All fields | `title`, `content`, `excerpt`, `category_id` | Only `title` and `content` |
| **Update** | All fields | `title`, `content`, `excerpt`, `category_id` | Only `title` and `content` |

An **editor** sending `{ "title": "Post", "is_published": true }` gets a `403` because `is_published` is not in their permitted list.

An **admin** sending the same payload succeeds -- all fields are accepted and validated against the format rules.

### Example 2: User Registration Validation

```ruby
# app/models/user.rb
class User < Lumina::LuminaModel
  include Lumina::HasPermissions

  has_secure_password

  validates :name, length: { maximum: 255 }, allow_nil: true
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, uniqueness: true, allow_nil: true
  validates :password, length: { minimum: 8, maximum: 128 }, allow_nil: true
end
```

```ruby
# app/policies/user_policy.rb
class UserPolicy < Lumina::ResourcePolicy
  self.resource_slug = 'users'

  def permitted_attributes_for_create(user)
    if has_role?(user, 'admin')
      ['name', 'email', 'password', 'role']
    else
      ['name', 'email', 'password']  # Cannot self-assign role
    end
  end

  def permitted_attributes_for_update(user)
    if has_role?(user, 'admin')
      ['name', 'email', 'password', 'role']
    else
      ['name', 'email', 'password']
    end
  end
end
```

### Example 3: Product with Numeric Constraints

```ruby
# app/models/product.rb
class Product < Lumina::LuminaModel
  include Lumina::BelongsToOrganization

  validates :name, length: { maximum: 255 }, allow_nil: true
  validates :sku, length: { maximum: 50 }, allow_nil: true
  validates :price, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :stock, numericality: { only_integer: true, greater_than_or_equal_to: 0 }, allow_nil: true
  validates :weight, numericality: { greater_than: 0 }, allow_nil: true

  belongs_to :category
  has_many :reviews
end
```
