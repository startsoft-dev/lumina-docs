# Lumina Rails Server — Soft Deletes (Skill)

You are a senior software engineer specialized in **Lumina**, a Rails gem that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **Rails (Ruby)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's soft delete system: setup using the Discard gem, generated endpoints, behavior, authorization, role-based access, custom logic, and audit trail integration.

---

## Documentation

### Setup

Lumina uses the [Discard](https://github.com/jmez/discard) gem for soft deletes. Add `has_discard` and a `discarded_at` column:

```ruby
class Post < ApplicationRecord
  include Discard::Model
  include Lumina::HasValidation
end
```

```ruby
# Migration
class CreatePosts < ActiveRecord::Migration[7.1]
  def change
    create_table :posts do |t|
      t.string :title
      t.text :content
      t.datetime :discarded_at # soft delete column
      t.timestamps
    end

    add_index :posts, :discarded_at
  end
end
```

Lumina **auto-detects** the `discarded_at` column. If your model includes `Discard::Model` and has `discarded_at`, Lumina generates all trash/restore/force-delete endpoints automatically.

Note: `LuminaModel` already includes `Discard::Model` — no need to add it manually.

### Endpoints

| Method | Endpoint | Description | Policy Method |
|--------|----------|-------------|---------------|
| `DELETE` | `/api/posts/:id` | Soft delete (move to trash) | `destroy?` |
| `GET` | `/api/posts/trashed` | List all trashed items | `view_trashed?` |
| `POST` | `/api/posts/:id/restore` | Restore from trash | `restore?` |
| `DELETE` | `/api/posts/:id/force-delete` | Permanently delete | `force_delete?` |

### Behavior

- `GET /api/posts` — excludes soft-deleted records (Discard default scope)
- `DELETE /api/posts/1` — sets `discarded_at`, record stays in database
- `GET /api/posts/trashed` — returns only soft-deleted records (with pagination)
- `POST /api/posts/1/restore` — clears `discarded_at`, record visible again
- `DELETE /api/posts/1/force-delete` — permanently removes from database

### Authorization

Each action has its own permission:
- `posts.destroy` — soft delete
- `posts.trashed` — view trashed
- `posts.restore` — restore
- `posts.forceDelete` — permanent delete

### Audit Trail Integration

If using both `Discard::Model` and `Lumina::HasAuditTrail`:
- Soft delete → `deleted`
- Restore → `restored`
- Force delete → `force_deleted`

---

## Frequently Asked Questions

**Q: How do I enable soft deletes?**

A: If you're using `LuminaModel`, soft deletes are already included. Just make sure your migration has a `discarded_at` datetime column with an index. That's it — Lumina auto-detects the Discard setup and generates all the trash/restore/force-delete endpoints automatically.

**Q: How do I restrict who can permanently delete records?**

A: Use permissions. Give force-delete only to admins:

```ruby
admin = Role.create!(
  name: "Admin",
  slug: "admin",
  permissions: ["*"]
)

editor = Role.create!(
  name: "Editor",
  slug: "editor",
  permissions: [
    "posts.destroy",     # Can soft-delete
    "posts.trashed",     # Can view trash
    "posts.restore",     # Can restore
    # NO posts.forceDelete — editors can't permanently delete
  ]
)
```

**Q: Can I allow users to only delete their own records?**

A: Override the policy's `destroy?` method:

```ruby
def destroy?(user, record)
  return true if user.has_permission?("*")
  super && record.user_id == user.id
end
```

**Q: Does the list endpoint include soft-deleted records?**

A: No. `GET /api/posts` excludes soft-deleted records (standard Discard behavior via the `kept` default scope). Use `GET /api/posts/trashed` to see only trashed records.

**Q: Is force delete reversible?**

A: No. Force delete permanently removes the record from the database. There is no way to recover it. Use appropriate permissions to restrict this action.

---

## Real-World Examples

### Role-Based Soft Delete Access

```ruby
# Create roles with different soft-delete permissions
admin = Role.create!(
  name: "Admin",
  slug: "admin",
  permissions: ["*"]
)

editor = Role.create!(
  name: "Editor",
  slug: "editor",
  permissions: [
    "posts.index", "posts.show", "posts.store", "posts.update",
    "posts.destroy",   # Can soft-delete
    "posts.trashed",   # Can view trash
    "posts.restore",   # Can restore
    # NO posts.forceDelete
  ]
)

viewer = Role.create!(
  name: "Viewer",
  slug: "viewer",
  permissions: ["posts.index", "posts.show"]
)
```

| Action | Admin | Editor | Viewer |
|--------|-------|--------|--------|
| Soft delete | Yes | Yes | No |
| View trashed | Yes | Yes | No |
| Restore | Yes | Yes | No |
| Force delete | Yes | **No** | No |

### Custom Authorization: Own Records Only

```ruby
class PostPolicy < Lumina::ResourcePolicy
  def destroy?(user, record)
    return true if user.has_permission?("*")
    super && record.user_id == user.id
  end

  def restore?(user, record)
    return true if user.has_permission?("*")
    super && record.user_id == user.id
  end

  def force_delete?(user, record)
    return true if user.has_permission?("*")
    super && record.user_id == user.id
  end
end
```

### Soft Delete Request/Response Flow

```bash
# Soft delete
DELETE /api/posts/1
# → 200 { "id": 1, "title": "My Post", "discarded_at": "2025-01-15T10:30:00Z" }

# List trashed
GET /api/posts/trashed?page=1&per_page=10
# → 200 [{ "id": 1, "title": "My Post", "discarded_at": "2025-01-15T10:30:00Z" }]

# Restore
POST /api/posts/1/restore
# → 200 { "id": 1, "title": "My Post", "discarded_at": null }

# Force delete
DELETE /api/posts/1/force-delete
# → 200 { "message": "Resource permanently deleted." }
```
