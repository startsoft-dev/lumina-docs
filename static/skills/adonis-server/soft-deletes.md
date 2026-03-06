# Lumina AdonisJS Server — Soft Deletes (Skill)

You are a senior software engineer specialized in **Lumina**, an AdonisJS package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **AdonisJS (TypeScript)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's soft delete support: enabling soft deletes on a model with `$softDeletes = true`, the `deletedAt` column, the three additional endpoints (trashed, restore, force-delete), authorization via policy methods, excluding specific soft-delete routes with `$exceptActions`, audit trail integration, and guard behavior.

---

## Documentation

### Enabling Soft Deletes

Set the `$softDeletes` static property on your model and add a `deletedAt` column:

```ts
import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { HasLumina } from '@startsoft/lumina-adonis/mixins/has_lumina'

export default class Post extends compose(BaseModel, HasLumina) {
  static $softDeletes = true

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column.dateTime()
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
```

Your migration must include the `deleted_at` column:

```ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'posts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('title').notNullable()
      table.timestamp('deleted_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }
}
```

### Soft Delete Endpoints

When `$softDeletes = true`, Lumina registers three additional routes:

| Method | Endpoint | Description | Policy Method |
|--------|----------|-------------|---------------|
| `GET` | `/api/posts/trashed` | List soft-deleted records | `viewTrashed(user)` |
| `POST` | `/api/posts/:id/restore` | Restore a soft-deleted record | `restore(user, record)` |
| `DELETE` | `/api/posts/:id/force-delete` | Permanently delete a record | `forceDelete(user, record)` |

The standard `DELETE /api/posts/:id` performs a soft delete (sets `deleted_at`) rather than a hard delete.

### Trashed Endpoint

```bash
GET /api/posts/trashed
```

Lists all soft-deleted records. Supports the same query parameters as the index endpoint:

```bash
# List trashed posts with sorting
GET /api/posts/trashed?sort=-deleted_at

# Search within trashed posts
GET /api/posts/trashed?search=old+draft

# Paginate trashed posts
GET /api/posts/trashed?page=1&per_page=10
```

### Restore Endpoint

```bash
POST /api/posts/:id/restore
```

Sets `deleted_at` back to `null`. Returns the restored record as JSON.

### Force Delete Endpoint

```bash
DELETE /api/posts/:id/force-delete
```

Permanently removes the record from the database. The record must be soft-deleted first. Returns `204 No Content` on success.

### Authorization

Each soft-delete action has its own policy method:

```ts
import { ResourcePolicy } from '@startsoft/lumina-adonis/policies/resource_policy'

export default class PostPolicy extends ResourcePolicy {
  static resourceSlug = 'posts'

  // Permission: posts.trashed
  async viewTrashed(user: any): Promise<boolean> {
    return this.checkPermission(user, 'trashed')
  }

  // Permission: posts.restore
  async restore(user: any, record: any): Promise<boolean> {
    return this.checkPermission(user, 'restore')
  }

  // Permission: posts.forceDelete
  async forceDelete(user: any, record: any): Promise<boolean> {
    return this.checkPermission(user, 'forceDelete')
  }
}
```

These are already implemented on `ResourcePolicy`. Override only if you need custom logic.

### Excluding Soft Delete Routes

Use `$exceptActions` to disable specific endpoints:

```ts
export default class Post extends compose(BaseModel, HasLumina) {
  static $softDeletes = true

  // Allow trashed listing and restore, but no force-delete via API
  static $exceptActions = ['forceDelete']
}
```

### Audit Trail Integration

When the `HasAuditTrail` mixin is also applied:

- Standard `DELETE` → logged as `deleted`
- `POST /:id/restore` → logged as `restored`
- `DELETE /:id/force-delete` → logged as `force_deleted`

The controller calls `logRestore()` after restoring and `logForceDelete()` before permanently deleting.

### Guard Behavior

If a request hits a trashed/restore/force-delete endpoint on a model without `$softDeletes = true`, Lumina returns `404`:

```json
{ "message": "This resource does not support soft deletes" }
```

---

## Frequently Asked Questions

**Q: How do I enable soft deletes on a model?**

A: Two things are needed:

```ts
export default class Post extends compose(BaseModel, HasLumina) {
  static $softDeletes = true

  @column.dateTime()
  declare deletedAt: DateTime | null
}
```

Plus the migration must include `table.timestamp('deleted_at').nullable()`.

**Q: What happens when I call DELETE on a soft-delete model?**

A: The record is not permanently removed. Instead, `deleted_at` is set to the current timestamp. The record won't appear in regular queries but can be found via the trashed endpoint.

**Q: How do I list soft-deleted records?**

A: Use the trashed endpoint:

```bash
GET /api/posts/trashed?sort=-deleted_at&page=1&per_page=15
```

It supports all the same query features (filters, sorts, search, includes) as the regular index endpoint.

**Q: How do I restore a soft-deleted record?**

A: Use the restore endpoint:

```bash
POST /api/posts/42/restore
```

This sets `deleted_at` back to `null` and returns the restored record.

**Q: How do I permanently delete a record?**

A: First soft-delete it, then use force-delete:

```bash
DELETE /api/posts/42/force-delete
```

Returns `204 No Content` on success.

**Q: What permissions do I need for soft-delete operations?**

A: Three permissions:

- `posts.trashed` — view soft-deleted records
- `posts.restore` — restore soft-deleted records
- `posts.forceDelete` — permanently delete records

Example role setup:

```ts
// Admin can do everything
const adminPerms = ['*']

// Editor can view and restore trash, but not force-delete
const editorPerms = ['posts.*']

// Viewer: read only, no trash access
const viewerPerms = ['posts.index', 'posts.show']
```

**Q: Can I disable force-delete but keep restore?**

A: Yes, use `$exceptActions`:

```ts
static $exceptActions = ['forceDelete']
```

This removes only the `DELETE /posts/:id/force-delete` endpoint.

---

## Real-World Examples

### Blog with Trash Management

```ts
// app/models/post.ts
import { DateTime } from 'luxon'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { compose } from '@adonisjs/core/helpers'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import { HasAuditTrail } from '@startsoft/lumina-adonis/mixins/has_audit_trail'
import User from '#models/user'

export default class Post extends compose(LuminaModel, HasAuditTrail) {
  static $softDeletes = true

  static $allowedFilters = ['status', 'user_id']
  static $allowedSorts = ['title', 'created_at', 'deleted_at']
  static $defaultSort = '-created_at'
  static $allowedSearch = ['title', 'content']

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column()
  declare content: string

  @column()
  declare status: string

  @column()
  declare userId: number

  @column.dateTime()
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
```

```ts
// app/policies/post_policy.ts
import { ResourcePolicy } from '@startsoft/lumina-adonis/policies/resource_policy'

export default class PostPolicy extends ResourcePolicy {
  static resourceSlug = 'posts'

  // Only admins can force-delete
  async forceDelete(user: any, record: any): Promise<boolean> {
    const isAdmin = await user.hasPermission('*')
    return isAdmin
  }

  // Authors and admins can restore their own posts
  async restore(user: any, record: any): Promise<boolean> {
    const isAdmin = await user.hasPermission('*')
    if (isAdmin) return true
    const hasPerm = await this.checkPermission(user, 'restore')
    return hasPerm && record.userId === user.id
  }
}
```

### E-Commerce: Orders with No Force Delete

```ts
export default class Order extends compose(LuminaModel) {
  static $softDeletes = true

  // Orders can be "cancelled" (soft-deleted) and restored, but never permanently deleted
  static $exceptActions = ['forceDelete']

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare customerName: string

  @column()
  declare total: number

  @column()
  declare status: string

  @column.dateTime()
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
```

API usage:

```bash
# Cancel an order (soft delete)
DELETE /api/orders/42

# List cancelled orders
GET /api/orders/trashed?sort=-deleted_at

# Reinstate a cancelled order
POST /api/orders/42/restore

# Force delete is NOT available — returns 404
```
