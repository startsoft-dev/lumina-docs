# Lumina Rails Server — Audit Trail (Skill)

You are a senior software engineer specialized in **Lumina**, a Rails gem that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **Rails (Ruby)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's audit trail system: enabling it with the `Lumina::HasAuditTrail` concern, what events are tracked (created, updated, deleted, force_deleted, restored), excluding sensitive fields with `lumina_audit_exclude`, audit log fields, the API endpoint for fetching logs, querying audit logs in code, context tracking via `RequestStore`, and multi-tenant audit logs.

---

## Documentation

### Enabling Audit Trail

During `rails lumina:install`, select **Yes** when asked about audit trail. This creates the `audit_logs` migration.

Then add the `Lumina::HasAuditTrail` concern to any model you want to track:

```ruby
class Post < Lumina::LuminaModel
  include Lumina::HasAuditTrail

  validates :title, length: { maximum: 255 }, allow_nil: true
  validates :status, inclusion: { in: %w[draft published archived] }, allow_nil: true
end
```

Run the migration:

```bash
rails db:migrate
```

### What Gets Logged

Every model event is automatically captured:

| Event | Action | Old Values | New Values |
|---|---|---|---|
| Model created | `created` | `null` | All new field values |
| Model updated | `updated` | Changed fields (before) | Changed fields (after) |
| Model soft-deleted | `deleted` | All field values | `null` |
| Model force-deleted | `force_deleted` | All field values | `null` |
| Model restored | `restored` | `null` | All field values |

On updates, only the fields that actually changed are logged -- not the entire model. This keeps audit logs clean and easy to read.

### Excluding Sensitive Fields

By default, `password` and `remember_token` are excluded from audit logs. Add more fields with the `lumina_audit_exclude` DSL:

```ruby
class User < Lumina::LuminaModel
  include Lumina::HasAuditTrail

  # These fields will never appear in audit logs
  lumina_audit_exclude :password, :remember_token, :api_token, :two_factor_secret, :stripe_id
end
```

### Audit Log Fields

Each audit log entry contains:

| Field | Type | Description |
|---|---|---|
| `id` | integer | Auto-increment ID |
| `auditable_type` | string | Full model class (e.g., `Post`) |
| `auditable_id` | integer | Primary key of the audited record |
| `action` | string | `created`, `updated`, `deleted`, `force_deleted`, `restored` |
| `old_values` | JSON | Previous field values (null on create) |
| `new_values` | JSON | New field values (null on delete) |
| `user_id` | integer | ID of the user who made the change |
| `organization_id` | integer | Organization context (multi-tenant) |
| `ip_address` | string | IP address of the request |
| `user_agent` | string | Browser/client user agent string |
| `created_at` | datetime | When the change occurred |

### API Endpoint

Fetch the audit trail for any model instance:

```bash
GET /api/posts/42/audit
GET /api/posts/42/audit?page=1&per_page=20
```

Supports pagination via query parameters.

**Response Example:**

```json
[
    {
        "id": 1,
        "action": "created",
        "user_id": 5,
        "auditable_type": "Post",
        "auditable_id": 42,
        "old_values": null,
        "new_values": {
            "title": "My First Post",
            "content": "Hello world!",
            "status": "draft"
        },
        "ip_address": "192.168.1.1",
        "user_agent": "Mozilla/5.0 ...",
        "created_at": "2025-01-15T10:30:00Z"
    },
    {
        "id": 2,
        "action": "updated",
        "user_id": 5,
        "auditable_type": "Post",
        "auditable_id": 42,
        "old_values": {
            "status": "draft"
        },
        "new_values": {
            "status": "published"
        },
        "ip_address": "192.168.1.1",
        "user_agent": "Mozilla/5.0 ...",
        "created_at": "2025-01-15T11:00:00Z"
    },
    {
        "id": 3,
        "action": "updated",
        "user_id": 8,
        "auditable_type": "Post",
        "auditable_id": 42,
        "old_values": {
            "title": "My First Post"
        },
        "new_values": {
            "title": "My First Post (Updated)"
        },
        "ip_address": "10.0.0.5",
        "user_agent": "PostmanRuntime/7.x",
        "created_at": "2025-01-16T14:22:00Z"
    }
]
```

### Querying Audit Logs in Code

The `Lumina::HasAuditTrail` concern adds an `audit_logs` polymorphic association:

```ruby
# Get all audit logs for a post
logs = post.audit_logs.order(created_at: :desc)

# Get only updates
updates = post.audit_logs.where(action: 'updated')

# Get changes by a specific user
user_changes = post.audit_logs.where(user_id: 5)

# Get recent changes (last 7 days)
recent = post.audit_logs
  .where('created_at >= ?', 7.days.ago)
  .order(created_at: :desc)

# Get who deleted a record
deletion = post.audit_logs.find_by(action: 'deleted')
puts "Deleted by user ##{deletion.user_id} at #{deletion.created_at}"
```

The `audit_logs` method is a polymorphic association, so it works identically on any model that uses the concern.

### Context Tracking

Lumina automatically captures request context for each audit entry via `RequestStore`:

- **user_id** -- The authenticated user making the change
- **ip_address** -- The IP address of the request
- **user_agent** -- The browser/client user agent string
- **organization_id** -- The current organization (multi-tenant)

This context is set by Lumina's controller before any model operations occur, so audit logs always have the correct metadata.

### Soft Delete and Restore Logging

When using both `Discard::Model` and `Lumina::HasAuditTrail`:

```ruby
class Post < Lumina::LuminaModel
  include Lumina::HasAuditTrail
  include Discard::Model
end

# Soft delete -- logs action: "deleted"
post.discard

# Restore -- logs action: "restored"
post.undiscard

# Force delete -- logs action: "force_deleted"
post.destroy
```

### Multi-Tenant Audit Logs

When multi-tenancy is enabled, the `organization_id` is automatically captured in each audit log entry. You can query audit logs per organization:

```ruby
Lumina::AuditLog.where(organization_id: organization.id)
  .order(created_at: :desc)
  .page(1)
  .per(20)
```

The audit trail endpoint respects the same authorization as the parent model. Users can only view audit logs for records they have permission to view.

---

## Frequently Asked Questions

**Q: How do I enable audit trail on a model?**

A: Add the `Lumina::HasAuditTrail` concern and make sure you have run the audit_logs migration:

```ruby
class Post < Lumina::LuminaModel
  include Lumina::HasAuditTrail
end
```

That is it. Lumina automatically logs all create, update, delete, restore, and force-delete events.

**Q: How do I exclude sensitive fields from audit logs?**

A: Use `lumina_audit_exclude`:

```ruby
lumina_audit_exclude :password, :remember_token, :api_token, :stripe_id
```

These fields will never appear in `old_values` or `new_values`.

**Q: Does the audit trail log all fields on update?**

A: No -- only fields that actually changed. If you update a post's title but not its content, only `title` appears in the audit log. This keeps logs clean and readable.

**Q: How do I fetch audit logs via the API?**

A: `GET /api/posts/42/audit` -- returns paginated audit log entries for post #42. Supports `?page=N&per_page=N`.

**Q: Can I query audit logs per organization?**

A: Yes. The `organization_id` is automatically captured:

```ruby
Lumina::AuditLog.where(organization_id: org.id)
  .order(created_at: :desc)
  .page(1)
  .per(20)
```

**Q: Who can view audit logs?**

A: The audit trail endpoint respects the same authorization as the parent model. Users can only view audit logs for records they have permission to view.

**Q: Can I enable audit trail on all models at once?**

A: Yes. Publish and customize the `LuminaModel` base class, then include the concern there:

```ruby
# app/models/lumina_model.rb
class LuminaModel < Lumina::LuminaModel
  include Lumina::HasAuditTrail
end
```

Now all models that extend `LuminaModel` will have audit trail enabled.

---

## Real-World Examples

### Example 1: Tracking All Changes to a Post

```ruby
# 1. User creates a post
post = Post.create!(
  title: 'Hello World',
  content: 'My first post',
  status: 'draft'
)
# -> Audit log: action=created, new_values={title, content, status}

# 2. User updates the status
post.update!(status: 'published')
# -> Audit log: action=updated, old_values={status: "draft"}, new_values={status: "published"}

# 3. User updates title and content
post.update!(
  title: 'Hello World (Revised)',
  content: 'Updated content here'
)
# -> Audit log: action=updated, old_values={title, content}, new_values={title, content}

# 4. User soft-deletes the post
post.discard
# -> Audit log: action=deleted, old_values={all fields}

# 5. Admin restores the post
post.undiscard
# -> Audit log: action=restored, new_values={all fields}

# 6. Admin permanently deletes
post.destroy
# -> Audit log: action=force_deleted, old_values={all fields}
```

### Example 2: User Model with Sensitive Field Exclusion

```ruby
class User < Lumina::LuminaModel
  include Lumina::HasPermissions
  include Lumina::HasAuditTrail

  has_secure_password

  # Never log these fields in audit trail
  lumina_audit_exclude :password, :password_digest, :remember_token,
                       :api_token, :two_factor_secret

  validates :name, length: { maximum: 255 }, allow_nil: true
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, allow_nil: true
end
```

When a user changes their password, the audit log records the update event but the `password` and `password_digest` fields are excluded from `old_values` and `new_values`.

### Example 3: Querying Audit Logs for a Compliance Report

```ruby
# All changes to posts in Acme Corp during January 2025
changes = Lumina::AuditLog
  .where(auditable_type: 'Post')
  .where(organization_id: acme_corp.id)
  .where(created_at: Date.new(2025, 1, 1)..Date.new(2025, 1, 31))
  .order(created_at: :asc)

changes.each do |log|
  puts "#{log.created_at}: #{log.action} by user ##{log.user_id}"
  puts "  Old: #{log.old_values}"
  puts "  New: #{log.new_values}"
end
```
