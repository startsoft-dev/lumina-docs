# Lumina Laravel Server — Nested Operations (Skill)

You are a senior software engineer specialized in **Lumina**, a Laravel package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **Laravel (PHP)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's nested operations: executing multiple model operations in a single atomic transaction, referencing previous results with `$N.field`, configuration, atomicity, authorization, and real-world batch operation examples.

---

## Documentation

### Endpoint

```bash
POST /api/nested                       # Without multi-tenancy
POST /api/{organization}/nested        # With multi-tenancy
```

Path is configurable:
```php
'nested' => ['path' => 'nested'],  // or 'batch' or 'bulk'
```

### Configuration

```php
'nested' => [
    'path' => 'nested',
    'max_operations' => 50,
    'allowed_models' => null, // null = all, or ['posts', 'comments']
],
```

### Request Format

```json
{
    "operations": [
        {
            "action": "create",
            "model": "blogs",
            "data": { "title": "My Blog", "slug": "my-blog" }
        },
        {
            "action": "create",
            "model": "posts",
            "data": { "title": "First Post", "blog_id": "$0.id" }
        }
    ]
}
```

### Supported Actions

| Action | Description | Required Fields |
|--------|-------------|-----------------|
| `create` | Create new record | `model`, `data` |
| `update` | Update existing | `model`, `id`, `data` |
| `delete` | Delete record | `model`, `id` |

### Referencing Previous Results

Use `$N.field` syntax:
- `$0.id` — `id` from first operation
- `$1.slug` — `slug` from second operation
- `$2.name` — `name` from third operation

### Atomicity

All operations run in a database transaction. If **any** fails, the **entire batch is rolled back**. No partial results.

Failed validation returns 422:
```json
{
    "message": "Validation failed.",
    "errors": {
        "operations.2.data.title": ["The title field is required"]
    }
}
```

### Authorization

Each operation is individually authorized using the model's policy:
- `create` on `blogs` → checks `blogs.store`
- `update` on `posts` → checks `posts.update`
- `delete` on `posts` → checks `posts.destroy`

If any check fails, the entire batch is rejected with 403.

---

## Frequently Asked Questions

**Q: How do I create related records in a single request?**

A: Use nested operations with `$N.id` references:

```json
{
    "operations": [
        {
            "action": "create",
            "model": "blogs",
            "data": { "title": "Tech Blog" }
        },
        {
            "action": "create",
            "model": "posts",
            "data": { "title": "First Post", "blog_id": "$0.id" }
        },
        {
            "action": "create",
            "model": "comments",
            "data": { "content": "Great!", "post_id": "$1.id" }
        }
    ]
}
```

The `$0.id` references the blog created in operation 0, `$1.id` references the post from operation 1.

**Q: What happens if one operation fails?**

A: Everything is rolled back. If operation 3 of 5 fails validation, operations 0-2 are also rolled back. It's all-or-nothing — no partial results.

**Q: Is each operation authorized separately?**

A: Yes. Each operation checks the model's policy independently. If the user can create blogs but not posts, the entire batch fails with 403.

**Q: What's the max number of operations?**

A: Default is 50. Configurable in `config/lumina.php`:

```php
'nested' => ['max_operations' => 100],
```

**Q: Can I reference fields other than `id`?**

A: Yes! You can reference any field from a previous result: `$0.slug`, `$1.name`, `$2.uuid`, etc.

**Q: Can I mix create, update, and delete in the same batch?**

A: Absolutely. Mix and match as needed:

```json
{
    "operations": [
        { "action": "create", "model": "blogs", "data": { "title": "New Blog" } },
        { "action": "update", "model": "posts", "id": 5, "data": { "blog_id": "$0.id" } },
        { "action": "delete", "model": "posts", "id": 10 }
    ]
}
```

---

## Real-World Examples

### E-Commerce: Create Order with Items

```json
{
    "operations": [
        {
            "action": "create",
            "model": "orders",
            "data": {
                "customer_name": "John Doe",
                "shipping_address": "123 Main St",
                "status": "pending"
            }
        },
        {
            "action": "create",
            "model": "order_items",
            "data": {
                "order_id": "$0.id",
                "product_id": 42,
                "quantity": 2,
                "unit_price": 29.99
            }
        },
        {
            "action": "create",
            "model": "order_items",
            "data": {
                "order_id": "$0.id",
                "product_id": 15,
                "quantity": 1,
                "unit_price": 49.99
            }
        }
    ]
}
```

### CMS: Create Page with Sections

```json
{
    "operations": [
        {
            "action": "create",
            "model": "pages",
            "data": { "title": "About Us", "slug": "about-us" }
        },
        {
            "action": "create",
            "model": "sections",
            "data": {
                "page_id": "$0.id",
                "title": "Our Mission",
                "content": "We build great software.",
                "order": 1
            }
        },
        {
            "action": "create",
            "model": "sections",
            "data": {
                "page_id": "$0.id",
                "title": "Our Team",
                "content": "Meet the people behind it all.",
                "order": 2
            }
        }
    ]
}
```

### Bulk Archive Posts

```json
{
    "operations": [
        { "action": "update", "model": "posts", "id": 1, "data": { "status": "archived" } },
        { "action": "update", "model": "posts", "id": 2, "data": { "status": "archived" } },
        { "action": "update", "model": "posts", "id": 3, "data": { "status": "archived" } }
    ]
}
```
