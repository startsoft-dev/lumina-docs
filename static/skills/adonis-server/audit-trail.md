# Lumina AdonisJS Server — Audit Trail (Skill)

You are a senior software engineer specialized in **Lumina**, an AdonisJS package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **AdonisJS (TypeScript)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's automatic audit trail system: the `HasAuditTrail` mixin, tracked model lifecycle events (`after:create`, `after:update`, `after:delete`), the `$auditExclude` property for sensitive fields, the `AuditLog` model and its schema, manual logging methods (`logRestore()` and `logForceDelete()`), querying audit logs, and the fail-safe design that ensures audit failures never break CRUD operations.

---

## Documentation

### HasAuditTrail Mixin

Apply the `HasAuditTrail` mixin to any model you want to audit:

```ts
import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { HasLumina } from '@startsoft/lumina-adonis/mixins/has_lumina'
import { HasAuditTrail } from '@startsoft/lumina-adonis/mixins/has_audit_trail'

export default class Post extends compose(BaseModel, HasLumina, HasAuditTrail) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column()
  declare content: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Exclude sensitive fields from audit logs
  static $auditExclude = ['password', 'remember_token']
}
```

### Tracked Events

The mixin hooks into Lucid model lifecycle events to capture changes automatically:

| Event | Action Logged | Old Values | New Values |
|-------|--------------|------------|------------|
| `after:create` | `created` | `null` | All attributes |
| `after:update` | `updated` | Changed fields (original values) | Changed fields (new values) |
| `after:delete` (soft) | `deleted` | All attributes | `null` |
| `after:delete` (hard) | `force_deleted` | All attributes | `null` |
| Manual call | `restored` | `null` | `null` |

For update events, only the dirty (changed) fields are recorded, not the entire record. If no fields actually changed, no audit log entry is created.

### AuditLog Model

Audit entries are stored in the `audit_logs` table using the `AuditLog` Lucid model:

```ts
import AuditLog from '@startsoft/lumina-adonis/models/audit_log'
```

Each entry contains:

| Column | Type | Description |
|--------|------|-------------|
| `id` | `number` | Primary key |
| `auditableType` | `string` | The model table name (e.g., `'posts'`, `'users'`) |
| `auditableId` | `number \| string` | The primary key of the audited record |
| `action` | `string` | One of: `created`, `updated`, `deleted`, `restored`, `force_deleted` |
| `oldValues` | `object \| null` | JSON snapshot of values before the change |
| `newValues` | `object \| null` | JSON snapshot of values after the change |
| `userId` | `number \| null` | The ID of the user who performed the action |
| `organizationId` | `number \| null` | The organization context (if multi-tenancy enabled) |
| `ipAddress` | `string \| null` | The IP address of the request |
| `userAgent` | `string \| null` | The User-Agent header of the request |
| `createdAt` | `DateTime` | When the log entry was created |
| `updatedAt` | `DateTime` | When the log entry was last updated |

The `auditableType` and `auditableId` columns form a polymorphic reference to the audited record.

### Excluding Fields

By default, the `password` and `remember_token` fields are excluded from audit log snapshots. Override the `$auditExclude` static property to customize which fields are excluded:

```ts
export default class User extends compose(BaseModel, HasAuditTrail) {
  static $auditExclude = ['password', 'remember_token', 'api_token', 'stripe_secret']
}
```

Excluded fields will never appear in `oldValues` or `newValues`, preventing sensitive data from being stored in the audit log.

### Request Context

The audit trail automatically captures the current HTTP request context using AdonisJS's `AsyncLocalStorage`-backed `HttpContext`:

- **userId** -- from `ctx.auth.user.id`
- **organizationId** -- from `ctx.organization.id` (if multi-tenancy is enabled)
- **ipAddress** -- from `ctx.request.ip()`
- **userAgent** -- from the `User-Agent` header

When running outside an HTTP context (e.g., Ace commands, tests, queue workers), these fields are set to `null`. Audit logging never throws an error when context is unavailable -- it silently records what it can.

### Manual Logging Methods

Lucid does not have native hooks for restore or force-delete operations, so the mixin provides two manual logging methods:

#### logRestore()

Call this after restoring a soft-deleted record to log a `restored` action:

```ts
const post = await Post.query().onlyTrashed().where('id', 1).firstOrFail()

// Restore the record
post.deletedAt = null
await post.save()

// Log the restoration
await post.logRestore()
```

The `ResourcesController` calls this automatically when processing `POST /:model/:id/restore` requests.

#### logForceDelete()

Call this before or after permanently deleting a record to log a `force_deleted` action:

```ts
const post = await Post.query().onlyTrashed().where('id', 1).firstOrFail()

// Log before deletion (so we capture the record's attributes)
await post.logForceDelete()

// Permanently delete
await Post.query().where('id', post.id).delete()
```

### Querying Audit Logs

Every model with the `HasAuditTrail` mixin gets an `auditLogs()` instance method that queries all audit log entries for that specific record:

```ts
const post = await Post.findOrFail(1)

// Get all audit logs for this post, ordered by most recent
const logs = await post.auditLogs()

for (const log of logs) {
  console.log(log.action)      // 'created', 'updated', etc.
  console.log(log.oldValues)   // Previous state
  console.log(log.newValues)   // Current state
  console.log(log.userId)      // Who made the change
  console.log(log.createdAt)   // When it happened
}
```

You can also query the `AuditLog` model directly for more advanced queries:

```ts
import AuditLog from '@startsoft/lumina-adonis/models/audit_log'

// All changes by a specific user
const userChanges = await AuditLog.query()
  .where('user_id', userId)
  .orderBy('created_at', 'desc')

// All deletions across all models
const deletions = await AuditLog.query()
  .where('action', 'deleted')
  .orderBy('created_at', 'desc')

// Changes to a specific model type
const postChanges = await AuditLog.query()
  .where('auditable_type', 'posts')
  .orderBy('created_at', 'desc')
```

### Migration

The `audit_logs` table is created by a Lumina migration. Make sure you run migrations after installing:

```bash
node ace migration:run
```

### Fail-Safe Design

Audit logging is designed to never break the main operation. All audit log creation is wrapped in try/catch blocks. If the `AuditLog` model is not available, the table does not exist, or a database error occurs during logging, the primary CRUD operation completes successfully and the audit failure is silently ignored.

---

## Frequently Asked Questions

**Q: How do I add audit trail to an existing model?**

A: Apply the `HasAuditTrail` mixin using the `compose()` pattern:

```ts
import { compose } from '@adonisjs/core/helpers'
import { HasLumina } from '@startsoft/lumina-adonis/mixins/has_lumina'
import { HasAuditTrail } from '@startsoft/lumina-adonis/mixins/has_audit_trail'

export default class Post extends compose(BaseModel, HasLumina, HasAuditTrail) {
  // ... your columns and relationships
}
```

Make sure the `audit_logs` migration has been run (`node ace migration:run`).

**Q: How do I exclude sensitive fields from audit logs?**

A: Set the `$auditExclude` static property on your model:

```ts
export default class User extends compose(BaseModel, HasAuditTrail) {
  static $auditExclude = ['password', 'remember_token', 'api_token', 'stripe_secret']
}
```

These fields will never appear in `oldValues` or `newValues`.

**Q: Are update logs created when no fields actually changed?**

A: No. The mixin only records dirty (changed) fields. If an update request is made but no values differ from the current state, no audit log entry is created.

**Q: Will audit logging break my app if the audit_logs table is missing?**

A: No. Audit logging is fail-safe. All log creation is wrapped in try/catch blocks. If the table is missing, the database is unreachable, or any error occurs during logging, the primary CRUD operation completes successfully and the error is silently ignored.

**Q: How do I log restore and force-delete operations?**

A: Use the manual methods provided by the mixin:

```ts
// After restoring a soft-deleted record
await post.logRestore()

// Before or after force-deleting
await post.logForceDelete()
```

The `ResourcesController` calls these automatically for restore and force-delete API requests.

**Q: How do I query all changes made by a specific user?**

A: Query the `AuditLog` model directly:

```ts
import AuditLog from '@startsoft/lumina-adonis/models/audit_log'

const changes = await AuditLog.query()
  .where('user_id', userId)
  .orderBy('created_at', 'desc')
```

**Q: Does the audit trail capture the user and organization context?**

A: Yes. It automatically captures `userId`, `organizationId`, `ipAddress`, and `userAgent` from the current HTTP context. When running outside HTTP context (Ace commands, background jobs), these fields are set to `null`.

---

## Real-World Examples

### Compliance Audit for a Financial Application

```ts
// app/models/transaction.ts
import { DateTime } from 'luxon'
import { column } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import { HasAuditTrail } from '@startsoft/lumina-adonis/mixins/has_audit_trail'
import { BelongsToOrganization } from '@startsoft/lumina-adonis/mixins/belongs_to_organization'

export default class Transaction extends compose(LuminaModel, BelongsToOrganization, HasAuditTrail) {
  static $auditExclude = ['internal_notes']

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare amount: number

  @column()
  declare status: string

  @column()
  declare organizationId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
```

```ts
// Querying audit trail for compliance
import AuditLog from '@startsoft/lumina-adonis/models/audit_log'

// Get all status changes for transactions in the last 30 days
const statusChanges = await AuditLog.query()
  .where('auditable_type', 'transactions')
  .where('action', 'updated')
  .where('created_at', '>=', DateTime.now().minus({ days: 30 }).toSQL())
  .orderBy('created_at', 'desc')

// Filter for status field changes specifically
const relevantChanges = statusChanges.filter(
  (log) => log.oldValues?.status || log.newValues?.status
)
```

### User Management with Full History

```ts
// app/models/user.ts
import { compose } from '@adonisjs/core/helpers'
import { column } from '@adonisjs/lucid/orm'
import { HasAuditTrail } from '@startsoft/lumina-adonis/mixins/has_audit_trail'

export default class User extends compose(BaseModel, HasAuditTrail) {
  // Never log password or token changes
  static $auditExclude = ['password', 'remember_token', 'api_token']

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @column()
  declare name: string

  @column()
  declare role: string
}
```

```ts
// View complete change history for a user
const user = await User.findOrFail(userId)
const history = await user.auditLogs()

for (const entry of history) {
  console.log(`[${entry.createdAt}] ${entry.action} by user ${entry.userId}`)
  if (entry.action === 'updated') {
    console.log('  Changed:', Object.keys(entry.oldValues || {}))
    console.log('  From:', entry.oldValues)
    console.log('  To:', entry.newValues)
  }
}
```

### Soft-Delete with Restore Logging

```ts
// app/models/document.ts
import { compose } from '@adonisjs/core/helpers'
import { column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import { HasAuditTrail } from '@startsoft/lumina-adonis/mixins/has_audit_trail'

export default class Document extends compose(LuminaModel, HasAuditTrail) {
  static $softDeletes = true

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column.dateTime()
  declare deletedAt: DateTime | null
}
```

```ts
// Manual restore with audit logging
const doc = await Document.query().onlyTrashed().where('id', docId).firstOrFail()

doc.deletedAt = null
await doc.save()
await doc.logRestore()
// Audit log entry: { action: 'restored', auditableType: 'documents', auditableId: docId }
```
