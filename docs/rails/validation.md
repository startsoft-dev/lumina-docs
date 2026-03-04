---
sidebar_position: 3
title: Validation
---

# Validation

Lumina automatically validates incoming request data on `store` and `update` endpoints using rules you define directly on your model. The validation system combines standard ActiveModel validations with a declarative DSL for per-action field allowlisting, presence modifiers, and role-based field access — all without writing a single controller.

## How Validation Works

Models opt into validation by including the `HasValidation` concern. You define your rules using two layers:

| Layer | Purpose |
|---|---|
| `validates` (ActiveModel) | Type and format constraints for fields (e.g., length, numericality, inclusion) |
| `lumina_store_rules` | Fields allowed on `POST` (create), with presence modifiers |
| `lumina_update_rules` | Fields allowed on `PUT`/`PATCH` (update), with presence modifiers |

When a request hits a `store` or `update` endpoint, Lumina:

1. Resolves the user's role (if role-based rules are defined)
2. Determines the permitted fields for that role
3. Filters the request data to only permitted fields (all others are silently dropped)
4. Checks presence requirements (`required`, `nullable`, `sometimes`)
5. Runs ActiveModel validations on a temporary instance
6. On failure, returns a `422` response with field-level errors
7. On success, proceeds with the operation using only the validated fields

```ruby
class Post < ApplicationRecord
  include Lumina::HasLumina
  include Lumina::HasValidation

  validates :title, length: { maximum: 255 }, allow_nil: true
  validates :status, inclusion: { in: %w[draft published archived] }, allow_nil: true

  lumina_store_rules(...)
  lumina_update_rules(...)
end
```

:::info
Validation runs automatically. You do not need to call any validation method yourself — Lumina intercepts the request before the data reaches your model.
:::

## Model-Level Validation (ActiveModel)

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

:::warning
All validators **must** use `allow_nil: true`. This is critical because `validate_store` and `validate_update` run on a blank model instance (`Model.new`), not the actual record. Without `allow_nil: true`, fields that are simply not submitted would fail validation. Presence requirements are handled separately by the store/update rules below.
:::

:::tip
Keep model-level validators focused on **type and format constraints** (e.g., `length: { maximum: 255 }`). Leave presence requirements (`required`, `nullable`, `sometimes`) to the store and update rules, since those typically differ between creating and updating.
:::

## Simple Format (Field Names Only)

The simplest way to define store or update rules is to list which fields are allowed:

```ruby
# Only 'title' and 'content' are accepted on store (both required)
lumina_store_rules :title, :content

# 'title', 'content', and 'status' are accepted on update (all optional)
lumina_update_rules :title, :content, :status
```

In this example, when a `POST` request comes in, only `title` and `content` are validated and accepted. Even if the request includes `status`, `user_id`, or any other field, those are silently ignored because they are not listed.

:::warning
Fields **not listed** in `lumina_store_rules` or `lumina_update_rules` are silently ignored. The request will not fail, but those fields will never reach your model. This is by design — it acts as an implicit allowlist.
:::

## Presence Modifiers

When using the associative format for store or update rules, you can set a **presence modifier** to control whether a field is required, optional, or conditionally validated.

```ruby
lumina_store_rules(
  '*': {
    title:   :required,    # Must be present and non-empty
    content: :nullable,    # Accepted but may be nil
    status:  :sometimes,   # Only validated if present in the request
  }
)
```

The three presence modifiers are:

| Modifier     | Behavior                                                        |
|--------------|-----------------------------------------------------------------|
| `required`   | The field **must** be present and non-empty                     |
| `nullable`   | The field is accepted but may be `nil`                          |
| `sometimes`  | The field is only validated **if it is present** in the request |

:::tip
Use `:required` for fields that must be submitted on create. Use `:sometimes` for update rules, since users typically only send the fields they want to change.
:::

## Role-Based Validation

**This is the most powerful feature of the validation system.** Different user roles can submit different fields, giving you fine-grained control over who can set what.

The format uses role slugs as keys in the store and update hashes:

```ruby
validates :title, length: { maximum: 255 }, allow_nil: true
validates :content, length: { maximum: 10_000 }, allow_nil: true
validates :status, inclusion: { in: %w[draft published archived] }, allow_nil: true
validates :is_published, inclusion: { in: [true, false] }, allow_nil: true

lumina_store_rules(
  # Admins can set everything
  admin: {
    title:        :required,
    content:      :required,
    status:       :nullable,
    is_published: :nullable,
    featured:     :nullable,
    category_id:  :nullable,
  },

  # Editors can set title and content, but not publishing fields
  editor: {
    title:   :required,
    content: :required,
  },

  # Wildcard fallback — any other role
  '*': {
    title:   :required,
    content: :required,
  }
)

lumina_update_rules(
  admin: {
    title:        :sometimes,
    content:      :sometimes,
    status:       :sometimes,
    is_published: :sometimes,
    featured:     :sometimes,
    category_id:  :sometimes,
  },
  editor: {
    title:   :sometimes,
    content: :sometimes,
  },
  '*': {
    title: :sometimes,
  }
)
```

Key behaviors:

- **Each role only sees the fields listed.** If `editor` sends `is_published: true` in the request body, that field is silently ignored because it is not in the editor's rule set.
- **The `*` wildcard** is a fallback that catches any role not explicitly defined. If a user has the role `viewer` and there is no `viewer` key, the `*` rules apply.
- **Admins get full access** to all fields, including sensitive publishing controls like `is_published` and `featured`.
- **Editors are restricted** — they can write content but cannot control publication status.

:::warning
Unlisted fields are **silently ignored**, not rejected. This means an editor sending `{ "title": "Hello", "is_published": true }` will succeed — but only `title` is saved. The `is_published` field is quietly dropped. This is intentional: it prevents information leakage about which fields exist while still enforcing access control.
:::

### How Role Resolution Works

For role-based validation to function, your `User` model must include the `HasPermissions` concern and define the `role_slug_for_validation` method:

```ruby
class User < ApplicationRecord
  include Lumina::HasPermissions

  has_many :user_roles

  def role_slug_for_validation(organization = nil)
    # Get the user's role for this organization
    ur = user_roles.find_by(organization_id: organization&.id)
    ur&.role&.slug  # e.g. 'admin', 'editor', 'viewer'
  end
end
```

:::info
The `organization` parameter is the resolved organization context from [multi-tenancy](/docs/rails/multi-tenancy). This allows users to have different roles in different organizations. If your application does not use multi-tenancy, the parameter may be `nil` — handle that case in your implementation.
:::

The resolution flow is:

1. Lumina detects that the store/update rules use role-based keys (a Hash of Hashes).
2. It calls `role_slug_for_validation(organization)` on the authenticated user.
3. It looks up the returned slug (e.g., `'editor'`) in the rules hash.
4. If the slug is not found, it falls back to the `'*'` wildcard.
5. If neither the slug nor `'*'` exists, no fields are permitted and the validated result is empty.

### Programmatic Access to Permitted Fields

You can query which fields are permitted for a given action and user:

```ruby
Post.permitted_fields_for(action: :store, user: current_user, organization: current_org)
# => ["title", "content"]

Post.permitted_fields_for(action: :update, user: admin_user, organization: current_org)
# => ["title", "content", "status", "is_published", "featured", "category_id"]
```

## Error Response Format

When validation fails, the API returns a `422 Unprocessable Entity` response with field-level errors:

```json
{
    "errors": {
        "title": ["The title field is required."],
        "content": ["is too long (maximum is 10000 characters)"]
    }
}
```

Each key in the `errors` object corresponds to a field name, and the value is an array of error messages for that field. A single field can have multiple errors if it violates more than one rule.

Presence errors (from `required` modifier) use the format `"The {field} field is required."`. Format errors come from standard Rails ActiveModel messages (e.g., `"is too long (maximum is 255 characters)"`).

## Complete Real-World Example

Here is a full `Post` model with role-based validation for three roles: **admin**, **editor**, and **author** (using the `*` wildcard as the author fallback).

```ruby
# app/models/post.rb
class Post < ApplicationRecord
  include Lumina::HasLumina
  include Lumina::HasValidation

  # -------------------------------------------------------
  # Model-level validation: type and format constraints
  # -------------------------------------------------------
  validates :title, length: { maximum: 255 }, allow_nil: true
  validates :content, length: { maximum: 50_000 }, allow_nil: true
  validates :excerpt, length: { maximum: 500 }, allow_nil: true
  validates :status, inclusion: { in: %w[draft published archived] }, allow_nil: true
  validates :category_id, numericality: { only_integer: true }, allow_nil: true
  validates :is_published, inclusion: { in: [true, false] }, allow_nil: true
  validates :featured, inclusion: { in: [true, false] }, allow_nil: true
  validates :is_pinned, inclusion: { in: [true, false] }, allow_nil: true

  # -------------------------------------------------------
  # Store rules: what each role can submit when creating
  # -------------------------------------------------------
  lumina_store_rules(
    # Admin: full access to all fields
    admin: {
      title:        :required,
      content:      :required,
      excerpt:      :nullable,
      status:       :nullable,
      category_id:  :nullable,
      is_published: :nullable,
      featured:     :nullable,
      is_pinned:    :nullable,
      published_at: :nullable,
      tags:         :nullable,
    },

    # Editor: content fields and category, but no publishing controls
    editor: {
      title:       :required,
      content:     :required,
      excerpt:     :nullable,
      category_id: :nullable,
    },

    # Author (wildcard): can only write title and content
    '*': {
      title:   :required,
      content: :required,
    }
  )

  # -------------------------------------------------------
  # Update rules: what each role can modify after creation
  # -------------------------------------------------------
  lumina_update_rules(
    # Admin: can update every field
    admin: {
      title:        :sometimes,
      content:      :sometimes,
      excerpt:      :sometimes,
      status:       :sometimes,
      category_id:  :sometimes,
      is_published: :sometimes,
      featured:     :sometimes,
      is_pinned:    :sometimes,
      published_at: :sometimes,
      tags:         :sometimes,
    },

    # Editor: can update content fields and category
    editor: {
      title:       :sometimes,
      content:     :sometimes,
      excerpt:     :sometimes,
      category_id: :sometimes,
    },

    # Author (wildcard): can only update title and content
    '*': {
      title:   :sometimes,
      content: :sometimes,
    }
  )
end
```

With this configuration:

| Action | Admin | Editor | Author (`*`) |
|--------|-------|--------|--------------|
| **Create** | All fields; `title` and `content` required | `title`, `content` (required), `excerpt`, `category_id` | Only `title` and `content` (required) |
| **Update** | Can modify any field | Can modify `title`, `content`, `excerpt`, `category_id` | Can only modify `title` and `content` |

An **editor** sending `{ "title": "New Post", "content": "...", "is_published": true, "is_pinned": true }` will have `is_published` and `is_pinned` silently stripped. The post is created with only `title` and `content`.

An **admin** sending the same payload will have all four fields accepted and applied.

An **author** (or any role without a specific key) falls through to the `*` wildcard and can only set `title` and `content`.
