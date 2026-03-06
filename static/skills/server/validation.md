# Lumina Laravel Server — Validation (Skill)

You are a senior software engineer specialized in **Lumina**, a Laravel package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **Laravel (PHP)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's automatic validation system: defining validation rules on models, field permissions via policies, custom error messages, the error response format, and how store/update validation differs.

---

## Documentation

### How Validation Works

When a request hits a `store` or `update` endpoint, Lumina:

1. Checks the policy's `permittedAttributesForCreate()` / `permittedAttributesForUpdate()` for allowed fields
2. If the request contains forbidden fields → `403 Forbidden`
3. Loads format rules from `$validationRules` for the permitted fields
4. Validates against those rules
5. On failure → `422` with field-level errors
6. On success → proceeds with only validated fields

### Validation Rules

Define format rules on the model:

```php
class Post extends Model
{
    use HasValidation, HidableColumns;

    protected $validationRules = [
        'title'        => 'string|max:255',
        'content'      => 'string',
        'status'       => 'string|in:draft,published,archived',
        'user_id'      => 'integer|exists:users,id',
        'is_published' => 'boolean',
        'published_at' => 'date',
        'tags'         => 'array',
        'tags.*'       => 'string|max:50',
    ];
}
```

Any standard Laravel validation rule works: `email`, `unique`, `exists`, `image`, `json`, `min`, `max`, `regex`, etc.

### Field Permissions via Policy

Which fields are accepted on store/update is determined by the policy:

```php
class PostPolicy extends ResourcePolicy
{
    public function permittedAttributesForCreate(?Authenticatable $user): array
    {
        if ($this->hasRole($user, 'admin')) {
            return ['*']; // Admins can set any field
        }
        return ['title', 'content']; // Others limited
    }

    public function permittedAttributesForUpdate(?Authenticatable $user): array
    {
        if ($this->hasRole($user, 'admin')) {
            return ['*'];
        }
        return ['title', 'content'];
    }
}
```

When a user submits forbidden fields:
```json
{
    "message": "You are not allowed to set the following field(s): status, is_published"
}
```

### Custom Error Messages

```php
protected $validationRulesMessages = [
    'title.required'   => 'Every post needs a title.',
    'title.max'        => 'Title cannot exceed 255 characters.',
    'status.in'        => 'Status must be draft, published, or archived.',
    'content.required' => 'Please provide content for the post.',
];
```

### Error Response Format

422 Unprocessable Entity:
```json
{
    "errors": {
        "title": ["Every post needs a title."],
        "status": ["Status must be draft, published, or archived."]
    }
}
```

---

## Frequently Asked Questions

**Q: How do I add validation to a model?**

A: Add the `$validationRules` property (or use `LuminaModel` which includes `HasValidation` automatically):

```php
class Post extends LuminaModel
{
    protected $validationRules = [
        'title'   => 'string|max:255',
        'content' => 'string',
        'status'  => 'string|in:draft,published,archived',
    ];
}
```

Validation runs automatically on `store` and `update` — no manual calls needed.

**Q: How do I make different roles able to set different fields?**

A: Define field permissions in the policy, not the model:

```php
class PostPolicy extends ResourcePolicy
{
    public function permittedAttributesForCreate(?Authenticatable $user): array
    {
        if ($this->hasRole($user, 'admin')) return ['*'];
        if ($this->hasRole($user, 'editor')) return ['title', 'content', 'excerpt', 'category_id'];
        return ['title', 'content'];
    }
}
```

The model's `$validationRules` handles format validation; the policy handles who can write which fields.

**Q: What's the difference between 403 and 422 errors?**

A:
- **403 Forbidden**: The user tried to set a field they're not allowed to (e.g., a regular user trying to set `is_published`)
- **422 Unprocessable Entity**: The field is allowed but the value failed format validation (e.g., `status` is not one of the allowed values)

**Q: Can I use any Laravel validation rule?**

A: Yes! All standard Laravel rules work: `email`, `unique:table,column`, `exists:table,column`, `image`, `json`, `min`, `max`, `regex`, `confirmed`, `date`, `numeric`, etc.

**Q: How do I add custom error messages?**

A: Use `$validationRulesMessages` with the `field.rule` format:

```php
protected $validationRulesMessages = [
    'title.required' => 'Every post needs a title.',
    'email.unique'   => 'This email is already registered.',
    'tags.*.max'     => 'Each tag must be 50 characters or fewer.',
];
```

---

## Real-World Examples

### Example 1: Complete Model + Policy with Role-Based Validation

```php
// Model
class Post extends LuminaModel
{
    protected $fillable = [
        'title', 'content', 'excerpt', 'status',
        'category_id', 'is_published', 'featured',
        'is_pinned', 'published_at', 'tags',
    ];

    protected $validationRules = [
        'title'        => 'string|max:255',
        'content'      => 'string',
        'excerpt'      => 'string|max:500',
        'status'       => 'string|in:draft,published,archived',
        'category_id'  => 'integer|exists:categories,id',
        'is_published' => 'boolean',
        'featured'     => 'boolean',
        'is_pinned'    => 'boolean',
        'published_at' => 'date',
        'tags'         => 'array',
        'tags.*'       => 'string|max:50',
    ];

    protected $validationRulesMessages = [
        'title.required'     => 'Every post needs a title.',
        'excerpt.max'        => 'Excerpt cannot exceed 500 characters.',
        'status.in'          => 'Status must be one of: draft, published, or archived.',
        'category_id.exists' => 'The selected category does not exist.',
    ];
}
```

```php
// Policy
class PostPolicy extends ResourcePolicy
{
    protected $resourceSlug = 'posts';

    public function permittedAttributesForCreate(?Authenticatable $user): array
    {
        if ($this->hasRole($user, 'admin')) return ['*'];
        if ($this->hasRole($user, 'editor')) return ['title', 'content', 'excerpt', 'category_id'];
        return ['title', 'content'];
    }

    public function permittedAttributesForUpdate(?Authenticatable $user): array
    {
        if ($this->hasRole($user, 'admin')) return ['*'];
        if ($this->hasRole($user, 'editor')) return ['title', 'content', 'excerpt', 'category_id'];
        return ['title', 'content'];
    }
}
```

**Result:**

| Action | Admin | Editor | Default |
|--------|-------|--------|---------|
| **Create** | All fields | `title`, `content`, `excerpt`, `category_id` | Only `title` and `content` |
| **Update** | All fields | `title`, `content`, `excerpt`, `category_id` | Only `title` and `content` |

An editor sending `{ "title": "Post", "is_published": true }` gets a `403` because `is_published` is not in their permitted list.
