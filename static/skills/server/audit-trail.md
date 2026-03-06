# Lumina Laravel Server — Audit Trail (Skill)

You are a senior software engineer specialized in **Lumina**, a Laravel package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **Laravel (PHP)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's audit trail system: enabling it, what events are tracked, excluding sensitive fields, audit log fields, the API endpoint, querying logs in code, and multi-tenant audit logs.

---

## Documentation

### Enabling Audit Trail

During `lumina:install`, select Yes for audit trail. Then add the trait:

```php
use Lumina\LaravelApi\Traits\HasAuditTrail;

class Post extends Model
{
    use SoftDeletes, HasValidation, HasAuditTrail;
}
```

Run `php artisan migrate` to create the `audit_logs` table.

### What Gets Logged

| Event | Action | Old Values | New Values |
|-------|--------|------------|------------|
| Created | `created` | `null` | All new field values |
| Updated | `updated` | Changed fields (before) | Changed fields (after) |
| Soft-deleted | `deleted` | All field values | `null` |
| Force-deleted | `force_deleted` | All field values | `null` |
| Restored | `restored` | `null` | All field values |

On updates, only fields that actually changed are logged.

### Excluding Sensitive Fields

Default exclusions: `password`, `remember_token`.

```php
class User extends Model
{
    use HasAuditTrail;

    protected $auditExclude = [
        'password', 'remember_token', 'api_token',
        'two_factor_secret', 'stripe_id',
    ];
}
```

### Audit Log Fields

| Field | Type | Description |
|-------|------|-------------|
| `auditable_type` | string | Model class (e.g., `App\Models\Post`) |
| `auditable_id` | integer | Primary key of audited record |
| `action` | string | `created`, `updated`, `deleted`, `force_deleted`, `restored` |
| `old_values` | JSON | Previous field values |
| `new_values` | JSON | New field values |
| `user_id` | integer | Who made the change |
| `organization_id` | integer | Organization context (multi-tenant) |
| `ip_address` | string | Request IP address |
| `user_agent` | string | Browser/client user agent |
| `created_at` | datetime | When the change occurred |

### API Endpoint

```bash
GET /api/posts/42/audit
GET /api/posts/42/audit?page=1&per_page=20
```

### Querying in Code

```php
// All logs for a post
$logs = $post->auditLogs()->latest()->get();

// Only updates
$updates = $post->auditLogs()->where('action', 'updated')->get();

// By a specific user
$userChanges = $post->auditLogs()->where('user_id', 5)->get();

// Recent changes (last 7 days)
$recent = $post->auditLogs()
    ->where('created_at', '>=', now()->subDays(7))
    ->latest()
    ->get();

// Who deleted a record
$deletion = $post->auditLogs()->where('action', 'deleted')->first();
```

### Multi-Tenant Audit Logs

Organization ID is automatically captured:

```php
AuditLog::where('organization_id', $organization->id)
    ->latest()
    ->paginate(20);
```

---

## Frequently Asked Questions

**Q: How do I enable audit trail on a model?**

A: Add the `HasAuditTrail` trait and make sure you've run the audit_logs migration:

```php
class Post extends LuminaModel
{
    use HasAuditTrail;
}
```

That's it. Lumina automatically logs all create, update, delete, restore, and force-delete events.

**Q: How do I exclude sensitive fields from audit logs?**

A: Use `$auditExclude`:

```php
protected $auditExclude = ['password', 'remember_token', 'api_token', 'stripe_id'];
```

These fields will never appear in `old_values` or `new_values`.

**Q: Does the audit trail log all fields on update?**

A: No — only fields that actually changed. If you update a post's title but not its content, only `title` appears in the audit log. This keeps logs clean and readable.

**Q: How do I fetch audit logs via the API?**

A: `GET /api/posts/42/audit` — returns paginated audit log entries for post #42. Supports `?page=N&per_page=N`.

**Q: Can I query audit logs per organization?**

A: Yes. The `organization_id` is automatically captured:

```php
AuditLog::where('organization_id', $org->id)->latest()->paginate(20);
```

**Q: Who can view audit logs?**

A: The audit trail endpoint respects the same authorization as the parent model. Users can only view audit logs for records they have permission to view.

---

## Real-World Examples

### Tracking All Changes to a Post

```php
// 1. Create
$post = Post::create(['title' => 'Hello World', 'status' => 'draft']);
// → action=created, new_values={title, status}

// 2. Update status
$post->update(['status' => 'published']);
// → action=updated, old={status: "draft"}, new={status: "published"}

// 3. Update title and content
$post->update(['title' => 'Hello World (Revised)', 'content' => 'Updated']);
// → action=updated, old={title, content}, new={title, content}

// 4. Soft delete
$post->delete();
// → action=deleted, old_values={all fields}

// 5. Restore
$post->restore();
// → action=restored, new_values={all fields}

// 6. Force delete
$post->forceDelete();
// → action=force_deleted, old_values={all fields}
```

### API Response Example

```bash
GET /api/posts/42/audit
```

```json
[
    {
        "id": 1,
        "action": "created",
        "user_id": 5,
        "old_values": null,
        "new_values": { "title": "My Post", "content": "Hello!", "status": "draft" },
        "ip_address": "192.168.1.1",
        "created_at": "2025-01-15T10:30:00Z"
    },
    {
        "id": 2,
        "action": "updated",
        "user_id": 5,
        "old_values": { "status": "draft" },
        "new_values": { "status": "published" },
        "ip_address": "192.168.1.1",
        "created_at": "2025-01-15T11:00:00Z"
    }
]
```
