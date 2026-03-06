# Lumina AdonisJS Server — Models (Skill)

You are a senior software engineer specialized in **Lumina**, an AdonisJS package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **AdonisJS (TypeScript)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina model configuration for AdonisJS: the `LuminaModel` base class, the `compose()` pattern for applying mixins, all available mixins (`HasLumina`, `HasValidation`, `HidableColumns`, `HasAutoScope`, `HasAuditTrail`, `HasUuid`, `BelongsToOrganization`, `HasPermissions`), all static configuration properties (`$allowedFilters`, `$allowedSorts`, `$defaultSort`, `$allowedIncludes`, `$allowedFields`, `$allowedSearch`, `$paginationEnabled`, `$perPage`, `$softDeletes`, `$middleware`, `$middlewareActions`, `$exceptActions`), Lucid column decorators, relationships, model registration in `config/lumina.ts`, and customizing the base model class.

---

## Documentation

### LuminaModel Base Class

The recommended way to create Lumina models is to extend `LuminaModel` -- a pre-composed base class that includes all the core mixins:

```ts
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import { column } from '@adonisjs/lucid/orm'

export default class Post extends LuminaModel {
  static $allowedFilters = ['status', 'user_id']
  static $allowedSorts = ['created_at', 'title']
  static $allowedSearch = ['title', 'content']

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string
}
```

`LuminaModel` extends `BaseModel` via `compose()` and includes these mixins automatically:

| Mixin | Purpose |
|---|---|
| `HasLumina` | Query builder DSL (`$allowedFilters`, `$allowedSorts`, etc.) |
| `HasValidation` | VineJS type/format validation with policy-driven field permissions |
| `HidableColumns` | Dynamic column hiding from API responses |
| `HasAutoScope` | Auto-discovery of `app/models/scopes/{Model}Scope` classes |

You no longer need to manually compose these mixins on every model.

### Optional Mixins

These mixins are **not** included in `LuminaModel` because they require additional database columns or relationships. Add them via `compose()` on top of `LuminaModel`:

```ts
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import { compose } from '@adonisjs/core/helpers'
import { HasAuditTrail } from '@startsoft/lumina-adonis/mixins/has_audit_trail'
import { BelongsToOrganization } from '@startsoft/lumina-adonis/mixins/belongs_to_organization'

export default class Invoice extends compose(LuminaModel, HasAuditTrail, BelongsToOrganization) {
  // ...
}
```

| Mixin | Purpose |
|---|---|
| `HasAuditTrail` | Automatic change logging to `audit_logs` table |
| `HasUuid` | Auto-generated UUID on creation |
| `BelongsToOrganization` | Multi-tenant organization scoping |
| `HasPermissions` | Permission checking (User model only) |

### Customizing LuminaModel

You can publish a customizable base class to your application:

```ts
// app/models/lumina_model.ts
import BaseLuminaModel from '@startsoft/lumina-adonis/models/lumina_model'

export default class LuminaModel extends BaseLuminaModel {
  // Add application-wide concerns here
}
```

Then import from your local file instead of the package.

### The compose() Pattern (Advanced)

For advanced use cases, AdonisJS's `compose()` helper lets you mix-and-match individual mixins:

```ts
import { BaseModel } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { HasLumina } from '@startsoft/lumina-adonis/mixins/has_lumina'
import { HasValidation } from '@startsoft/lumina-adonis/mixins/has_validation'

export default class Post extends compose(BaseModel, HasLumina, HasValidation) {
  // Model definition...
}
```

This is equivalent to extending `LuminaModel` but gives you explicit control over which mixins are applied.

### Complete Model Example

Below is a complete model example demonstrating all available static properties:

```ts
import { DateTime } from 'luxon'
import { column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { compose } from '@adonisjs/core/helpers'
import vine from '@vinejs/vine'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import { HasAuditTrail } from '@startsoft/lumina-adonis/mixins/has_audit_trail'
import { BelongsToOrganization } from '@startsoft/lumina-adonis/mixins/belongs_to_organization'
import User from '#models/user'
import Comment from '#models/comment'

export default class Post extends compose(
  LuminaModel,
  HasAuditTrail,
  BelongsToOrganization
) {
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

  @column()
  declare categoryId: number

  @column()
  declare organizationId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare deletedAt: DateTime | null

  // -- Validation (VineJS) --
  static $validationSchema = {
    title: vine.string().maxLength(255),
    content: vine.string(),
    status: vine.enum(['draft', 'published', 'archived']),
  }

  // -- Query Builder --
  static $allowedFilters = ['status', 'user_id', 'category_id']
  static $allowedSorts = ['created_at', 'title', 'updated_at']
  static $defaultSort = '-created_at'
  static $allowedFields = ['id', 'title', 'content', 'status']
  static $allowedIncludes = ['user', 'comments', 'tags']
  static $allowedSearch = ['title', 'content']

  // -- Pagination --
  static $paginationEnabled = true
  static $perPage = 25

  // -- Soft Deletes --
  static $softDeletes = true

  // -- Middleware --
  static $middleware = ['throttle:60,1']
  static $middlewareActions = {
    store: ['verified'],
    destroy: ['admin'],
  }

  // -- Route Exclusion --
  static $exceptActions = ['destroy'] // skip DELETE endpoint

  // -- Policy --
  static $policy = () => import('#policies/post_policy')

  // -- Relationships --
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => Comment)
  declare comments: HasMany<typeof Comment>
}
```

### Property Reference

| Property | Type | Default | Description |
|---|---|---|---|
| `$allowedFilters` | `string[]` | `[]` | Fields available for query-string filtering via `?filter[field]=value`. Only the fields listed here can be filtered on. |
| `$allowedSorts` | `string[]` | `[]` | Fields available for sorting via `?sort=field`. Prefix with `-` for descending order. |
| `$defaultSort` | `string` | `'-created_at'` | The sort applied when no `?sort` parameter is provided. Use the `-` prefix for descending. |
| `$allowedFields` | `string[]` | `[]` | Fields that can be selected via sparse fieldsets (`?fields[model]=field1,field2`). |
| `$allowedIncludes` | `string[]` | `[]` | Relationships that can be eager-loaded via `?include=relation`. Must correspond to defined Lucid relationships. |
| `$allowedSearch` | `string[]` | `[]` | Fields searched when `?search=term` is used. Supports dot notation for relations (e.g., `'user.name'`). |
| `$paginationEnabled` | `boolean` | `true` | Enables or disables pagination for the index endpoint. |
| `$perPage` | `number` | `15` | Number of records per page when pagination is enabled. |
| `$softDeletes` | `boolean` | `false` | Enables soft delete endpoints. Requires a `deletedAt` column on the model. |
| `$middleware` | `string[]` | `[]` | Middleware names applied to all routes for this model. |
| `$middlewareActions` | `Record<string, string[]>` | `{}` | Middleware applied to specific actions only. |
| `$exceptActions` | `string[]` | `[]` | CRUD actions to exclude from route generation. |

You only need to declare properties that differ from their defaults.

### Available Mixins in Detail

#### HasLumina

The core mixin that adds all the static DSL properties for the Lumina REST API layer. Provides the foundation for filters, sorts, includes, fields, search, pagination, middleware, and route exclusion.

**Included in LuminaModel** -- no need to add manually.

```ts
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'

export default class Post extends LuminaModel {
  static $allowedFilters = ['status', 'user_id']
  static $allowedSorts = ['created_at', 'title']
  static $defaultSort = '-created_at'
  static $allowedIncludes = ['user', 'comments']
  static $allowedSearch = ['title', 'content']
  static $allowedFields = ['id', 'title', 'content', 'status']
  static $paginationEnabled = true
  static $perPage = 20
  static $middleware = []
  static $middlewareActions = {}
  static $exceptActions = []
}
```

#### HasValidation

Adds VineJS type/format validation via the `validateForAction()` static method. Field permissions (which fields each user can submit) are controlled by the **policy**, not the model.

**Included in LuminaModel** -- no need to add manually.

```ts
import vine from '@vinejs/vine'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'

export default class Post extends LuminaModel {
  static $validationSchema = {
    title: vine.string().maxLength(255),
    content: vine.string(),
    status: vine.enum(['draft', 'published', 'archived']),
  }
}
```

#### HasPermissions

Adds role-based permission checking to the **User** model. Provides `hasPermission()` and `getRoleSlugForValidation()` methods.

```ts
import { compose } from '@adonisjs/core/helpers'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { HasPermissions } from '@startsoft/lumina-adonis/mixins/has_permissions'
import UserRole from '#models/user_role'

export default class User extends compose(LuminaModel, HasPermissions) {
  @hasMany(() => UserRole)
  declare userRoles: HasMany<typeof UserRole>
}

// Check if a user can create posts within an organization
const canCreate = await user.hasPermission('posts.store', organization)
```

#### HasAuditTrail

Automatically records changes to your model in an audit log. Uses Lucid model hooks (`after:create`, `after:update`, `after:delete`) to track creation, updates, deletion, force-deletion, and restoration events with old and new values.

```ts
import { compose } from '@adonisjs/core/helpers'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import { HasAuditTrail } from '@startsoft/lumina-adonis/mixins/has_audit_trail'

export default class User extends compose(LuminaModel, HasAuditTrail) {
  static $auditExclude = ['password', 'remember_token', 'api_token']
}
```

#### HasUuid

Automatically generates a UUID for the model when it is created. Hooks into Lucid's `before:create` event and fills the `uuid` column if empty.

```ts
import { compose } from '@adonisjs/core/helpers'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import { column } from '@adonisjs/lucid/orm'
import { HasUuid } from '@startsoft/lumina-adonis/mixins/has_uuid'

export default class Invoice extends compose(LuminaModel, HasUuid) {
  @column()
  declare uuid: string
}
```

Your database table must have a `uuid` column:

```ts
table.uuid('uuid').unique().nullable()
```

#### HasAutoScope

Automatically applies a global scope based on a naming convention. Looks for a scope class at `app/models/scopes/{model_name}_scope.ts` and applies it if found.

**Included in LuminaModel** -- no need to add manually.

```ts
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'

export default class Post extends LuminaModel {
  // Automatically loads app/models/scopes/post_scope.ts (if it exists)
}
```

The scope file name is derived by converting PascalCase to snake_case and appending `_scope`. For example, `BlogPost` becomes `blog_post_scope`.

#### BelongsToOrganization

Provides multi-tenant organization scoping. Automatically filters all queries to the current organization and sets `organizationId` when creating new records.

```ts
import { compose } from '@adonisjs/core/helpers'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { BelongsToOrganization } from '@startsoft/lumina-adonis/mixins/belongs_to_organization'
import Organization from '#models/organization'

export default class Post extends compose(LuminaModel, BelongsToOrganization) {
  @column()
  declare organizationId: number

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
```

#### HidableColumns

Controls which columns are hidden from API responses. Provides multiple layers of column visibility control.

**Included in LuminaModel** -- no need to add manually.

```ts
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'

export default class User extends LuminaModel {
  static $additionalHiddenColumns = ['api_token', 'stripe_id']
}
```

Layers of hidden columns (applied in order):

1. **Base hidden columns** (always hidden): `password`, `rememberToken`, `createdAt`, `updatedAt`, `deletedAt`
2. **Model-level hidden columns** via `$additionalHiddenColumns`
3. **Policy-level hidden columns** via `hiddenAttributesForShow()` method
4. **Policy-level whitelist** via `permittedAttributesForShow()` method

### Lucid Column Decorators

Lumina models use standard AdonisJS Lucid column decorators:

```ts
import { DateTime } from 'luxon'
import { column } from '@adonisjs/lucid/orm'

export default class Post extends LuminaModel {
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

  @column.dateTime()
  declare deletedAt: DateTime | null
}
```

### Relationships

Lumina models support all standard Lucid relationships:

```ts
import { belongsTo, hasMany, hasOne, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne, ManyToMany } from '@adonisjs/lucid/types/relations'

export default class Post extends LuminaModel {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => Comment)
  declare comments: HasMany<typeof Comment>

  @hasOne(() => PostMeta)
  declare meta: HasOne<typeof PostMeta>

  @manyToMany(() => Tag)
  declare tags: ManyToMany<typeof Tag>
}
```

Relationships must be listed in `$allowedIncludes` to be available via `?include=` query parameters.

### Model Registration

Models are registered in `config/lumina.ts`. The key becomes the URL slug and the permission prefix:

```ts
import { defineConfig } from '@startsoft/lumina-adonis'

export default defineConfig({
  models: {
    'blog-posts': () => import('#models/blog_post'),
    comments: () => import('#models/comment'),
    categories: () => import('#models/category'),
    tags: () => import('#models/tag'),
  },
})
```

This generates routes such as:

```
GET    /api/blog-posts
GET    /api/blog-posts/:id
POST   /api/blog-posts
PUT    /api/blog-posts/:id
DELETE /api/blog-posts/:id
```

The model key (e.g., `blog-posts`) is also used as the permission prefix. Make sure it matches what you use in your role permission definitions (e.g., `blog-posts.store`, `blog-posts.index`).

---

## Frequently Asked Questions

**Q: What is the difference between `LuminaModel` and composing mixins manually?**

A: `LuminaModel` is a convenience class that pre-composes `HasLumina`, `HasValidation`, `HidableColumns`, and `HasAutoScope` for you. You can achieve the same result with:

```ts
import { BaseModel } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { HasLumina } from '@startsoft/lumina-adonis/mixins/has_lumina'
import { HasValidation } from '@startsoft/lumina-adonis/mixins/has_validation'
import { HidableColumns } from '@startsoft/lumina-adonis/mixins/hidable_columns'
import { HasAutoScope } from '@startsoft/lumina-adonis/mixins/has_auto_scope'

export default class Post extends compose(BaseModel, HasLumina, HasValidation, HidableColumns, HasAutoScope) {
  // ...
}
```

Use `LuminaModel` for simplicity, or compose manually when you need full control.

**Q: How do I add audit trail and organization scoping to my model?**

A: Use `compose()` on top of `LuminaModel`:

```ts
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import { compose } from '@adonisjs/core/helpers'
import { HasAuditTrail } from '@startsoft/lumina-adonis/mixins/has_audit_trail'
import { BelongsToOrganization } from '@startsoft/lumina-adonis/mixins/belongs_to_organization'

export default class Invoice extends compose(LuminaModel, HasAuditTrail, BelongsToOrganization) {
  // Your model definition...
}
```

**Q: What columns are hidden by default from API responses?**

A: The `HidableColumns` mixin always hides: `password`, `rememberToken`, `createdAt`, `updatedAt`, and `deletedAt`. You can add more via `$additionalHiddenColumns` on the model or `hiddenAttributesForShow()` on the policy.

**Q: How does nested organization scoping work?**

A: Lumina auto-detects the organization path by walking `belongsTo` relationships. For example, if `Comment` belongs to `Post`, and `Post` has `organization_id`, Lumina automatically scopes queries through that chain -- no configuration needed.

**Q: Do I need to declare all static properties?**

A: No. You only need to declare properties that differ from their defaults. For example, if you do not need filtering, simply omit `$allowedFilters` entirely. The defaults are empty arrays for most properties, `true` for `$paginationEnabled`, `15` for `$perPage`, and `'-created_at'` for `$defaultSort`.

**Q: How do I register a model with a custom URL slug?**

A: The key in the `models` map becomes the URL slug:

```ts
models: {
  'blog-posts': () => import('#models/blog_post'),
}
```

This creates routes at `/api/blog-posts` and uses `blog-posts` as the permission prefix (e.g., `blog-posts.store`).

**Q: Can I exclude specific CRUD actions from route generation?**

A: Yes, use `$exceptActions`:

```ts
export default class Setting extends LuminaModel {
  static $exceptActions = ['store', 'update', 'destroy', 'trashed', 'restore', 'forceDelete']
}
```

This creates only `GET /api/settings` and `GET /api/settings/:id` endpoints.

---

## Real-World Examples

### Example 1: E-Commerce Product Model

```ts
// app/models/product.ts
import { DateTime } from 'luxon'
import { column, belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import { compose } from '@adonisjs/core/helpers'
import vine from '@vinejs/vine'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import { HasAuditTrail } from '@startsoft/lumina-adonis/mixins/has_audit_trail'
import { BelongsToOrganization } from '@startsoft/lumina-adonis/mixins/belongs_to_organization'
import Category from '#models/category'
import Tag from '#models/tag'

export default class Product extends compose(LuminaModel, HasAuditTrail, BelongsToOrganization) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string

  @column()
  declare price: number

  @column()
  declare sku: string

  @column()
  declare status: string

  @column()
  declare categoryId: number

  @column()
  declare organizationId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare deletedAt: DateTime | null

  static $validationSchema = {
    name: vine.string().maxLength(255),
    description: vine.string(),
    price: vine.number().min(0),
    sku: vine.string().maxLength(50),
    status: vine.enum(['draft', 'active', 'discontinued']),
  }

  static $allowedFilters = ['status', 'category_id']
  static $allowedSorts = ['created_at', 'name', 'price']
  static $defaultSort = '-created_at'
  static $allowedFields = ['id', 'name', 'description', 'price', 'sku', 'status']
  static $allowedIncludes = ['category', 'tags']
  static $allowedSearch = ['name', 'description', 'sku']
  static $softDeletes = true
  static $perPage = 20

  static $policy = () => import('#policies/product_policy')

  @belongsTo(() => Category)
  declare category: BelongsTo<typeof Category>

  @manyToMany(() => Tag)
  declare tags: ManyToMany<typeof Tag>
}
```

### Example 2: User Model with Permissions

```ts
// app/models/user.ts
import { DateTime } from 'luxon'
import { column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { compose } from '@adonisjs/core/helpers'
import vine from '@vinejs/vine'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import { HasPermissions } from '@startsoft/lumina-adonis/mixins/has_permissions'
import UserRole from '#models/user_role'

export default class User extends compose(LuminaModel, HasPermissions) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare permissions: string[] | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static $validationSchema = {
    name: vine.string().maxLength(255),
    email: vine.string().email(),
  }

  static $allowedFilters = ['name', 'email']
  static $allowedSorts = ['created_at', 'name']
  static $defaultSort = 'name'
  static $allowedSearch = ['name', 'email']
  static $additionalHiddenColumns = ['api_token', 'stripe_id']

  static $policy = () => import('#policies/user_policy')

  @hasMany(() => UserRole)
  declare userRoles: HasMany<typeof UserRole>
}
```

### Example 3: Lightweight Tag Model (No Extras)

```ts
// app/models/tag.ts
import { column } from '@adonisjs/lucid/orm'
import vine from '@vinejs/vine'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'

export default class Tag extends LuminaModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare slug: string

  static $validationSchema = {
    name: vine.string().maxLength(100),
    slug: vine.string().maxLength(100),
  }

  static $allowedFilters = ['name']
  static $allowedSorts = ['name']
  static $defaultSort = 'name'
  static $allowedSearch = ['name']
  static $paginationEnabled = false  // Return all tags, no pagination
}
```
