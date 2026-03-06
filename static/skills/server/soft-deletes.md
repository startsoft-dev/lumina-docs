# Lumina Laravel Server — Soft Deletes (Skill)

You are a senior software engineer specialized in **Lumina**, a Laravel package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **Laravel (PHP)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's soft delete system: setup, generated endpoints, behavior, authorization, role-based access, custom logic, and audit trail integration.

---

## Documentation

### Setup

Add `SoftDeletes` trait and `softDeletes()` column:

```php
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model
{
    use SoftDeletes, HasValidation;
}
```

```php
// Migration
Schema::create('posts', function (Blueprint $table) {
    $table->id();
    $table->string('title');
    $table->text('content');
    $table->softDeletes(); // adds deleted_at column
    $table->timestamps();
});
```

Note: `LuminaModel` already includes `SoftDeletes` — no need to add it manually.

### Endpoints

| Method | Endpoint | Description | Policy Method |
|--------|----------|-------------|---------------|
| `DELETE` | `/api/posts/{id}` | Soft delete (move to trash) | `delete()` |
| `GET` | `/api/posts/trashed` | List all trashed items | `viewTrashed()` |
| `POST` | `/api/posts/{id}/restore` | Restore from trash | `restore()` |
| `DELETE` | `/api/posts/{id}/force-delete` | Permanently delete | `forceDelete()` |

### Behavior

- `GET /api/posts` — excludes soft-deleted records
- `DELETE /api/posts/1` — sets `deleted_at`, record stays in database
- `GET /api/posts/trashed` — returns only soft-deleted records (with pagination)
- `POST /api/posts/1/restore` — clears `deleted_at`, record visible again
- `DELETE /api/posts/1/force-delete` — permanently removes from database

### Authorization

Each action has its own permission:
- `posts.destroy` — soft delete
- `posts.trashed` — view trashed
- `posts.restore` — restore
- `posts.forceDelete` — permanent delete

### Audit Trail Integration

If using both `SoftDeletes` and `HasAuditTrail`:
- Soft delete → `deleted`
- Restore → `restored`
- Force delete → `force_deleted`

---

## Frequently Asked Questions

**Q: How do I enable soft deletes?**

A: If you're using `LuminaModel`, soft deletes are already included. Just make sure your migration has `$table->softDeletes()`. That's it — Lumina generates all the trash/restore/force-delete endpoints automatically.

**Q: How do I restrict who can permanently delete records?**

A: Use permissions. Give force-delete only to admins:

```php
$admin = Role::create([
    'name' => 'Admin',
    'permissions' => ['*'],
]);

$editor = Role::create([
    'name' => 'Editor',
    'permissions' => [
        'posts.destroy',     // Can soft-delete
        'posts.trashed',     // Can view trash
        'posts.restore',     // Can restore
        // NO posts.forceDelete — editors can't permanently delete
    ],
]);
```

**Q: Can I allow users to only delete their own records?**

A: Override the policy's `delete()` method:

```php
public function delete(?Authenticatable $user, $model): bool
{
    if ($user->hasPermission('*')) return true;
    return parent::delete($user, $model) && $model->user_id === $user->id;
}
```

**Q: Does the list endpoint include soft-deleted records?**

A: No. `GET /api/posts` excludes soft-deleted records (standard Laravel behavior). Use `GET /api/posts/trashed` to see only trashed records.

**Q: Is force delete reversible?**

A: No. Force delete permanently removes the record from the database. There is no way to recover it. Use appropriate permissions to restrict this action.

---

## Real-World Examples

### Role-Based Soft Delete Access

```php
// Create roles with different soft-delete permissions
$admin = Role::create([
    'name' => 'Admin',
    'slug' => 'admin',
    'permissions' => ['*'],
]);

$editor = Role::create([
    'name' => 'Editor',
    'slug' => 'editor',
    'permissions' => [
        'posts.index', 'posts.show', 'posts.store', 'posts.update',
        'posts.destroy',   // Can soft-delete
        'posts.trashed',   // Can view trash
        'posts.restore',   // Can restore
        // NO posts.forceDelete
    ],
]);

$viewer = Role::create([
    'name' => 'Viewer',
    'slug' => 'viewer',
    'permissions' => ['posts.index', 'posts.show'],
]);
```

| Action | Admin | Editor | Viewer |
|--------|-------|--------|--------|
| Soft delete | Yes | Yes | No |
| View trashed | Yes | Yes | No |
| Restore | Yes | Yes | No |
| Force delete | Yes | **No** | No |

### Soft Delete Request/Response Flow

```bash
# Soft delete
DELETE /api/posts/1
# → 200 { "id": 1, "title": "My Post", "deleted_at": "2025-01-15T10:30:00Z" }

# List trashed
GET /api/posts/trashed?page=1&per_page=10
# → 200 [{ "id": 1, "title": "My Post", "deleted_at": "2025-01-15T10:30:00Z" }]

# Restore
POST /api/posts/1/restore
# → 200 { "id": 1, "title": "My Post", "deleted_at": null }

# Force delete
DELETE /api/posts/1/force-delete
# → 200 { "message": "Resource permanently deleted." }
```
