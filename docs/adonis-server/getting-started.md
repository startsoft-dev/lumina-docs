---
sidebar_position: 1
title: Getting Started
---

# AdonisJS Server -- Getting Started

Install Lumina for AdonisJS and go from zero to a full REST API in under 5 minutes.

## Requirements

- Node.js 20+
- AdonisJS v6 application
- npm or yarn

## Installation

```bash
npm install @startsoft/lumina-adonis
```

Then run the AdonisJS configure command:

```bash
node ace configure @startsoft/lumina-adonis
```

The configure command will:

- Publish the `config/lumina.ts` configuration file
- Register the Lumina service provider
- Set up route bindings and middleware
- Optionally enable multi-tenant support (organizations, roles)
- Optionally enable audit trail (change logging)

## Configuration

After installation, your config file is at `config/lumina.ts`:

```ts
// config/lumina.ts
import { defineConfig } from '@startsoft/lumina-adonis'

export default defineConfig({
  // Model registration -- slug => async model import
  models: {
    posts: () => import('#models/post'),
    comments: () => import('#models/comment'),
  },

  // Route groups -- controls URL prefixes, middleware, and model access
  routeGroups: {
    default: {
      prefix: '',          // Routes at /api/{slug}
      middleware: [],
      models: '*',         // All registered models
    },
  },

  // Multi-tenancy settings
  multiTenant: {
    organizationIdentifierColumn: 'id',   // 'id', 'slug', or 'uuid'
  },

  // Invitation system
  invitations: {
    expiresDays: 7,
    allowedRoles: null, // null = all roles, or ['admin', 'editor']
  },

  // Nested operations
  nested: {
    path: 'nested',         // Route path
    maxOperations: 50,      // Max ops per request
    allowedModels: null,    // null = all registered models
  },

  // Postman export
  postman: {
    baseUrl: '{{baseUrl}}/api',
    collectionName: 'Lumina API',
  },
})
```

The `defineConfig()` function merges your values with sensible defaults, so you only need to specify the properties you want to override.

## Environment Variables

Add these to your `.env` file as needed:

```env
# Invitation expiration (days)
INVITATION_EXPIRES_DAYS=7
```

## Register Your First Model

Create a Lucid model extending `LuminaModel`:

```ts
// app/models/post.ts
import { DateTime } from 'luxon'
import { column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import vine from '@vinejs/vine'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import User from '#models/user'
import Comment from '#models/comment'

export default class Post extends LuminaModel {
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

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // -- Validation (VineJS type schemas) --
  static $validationSchema = {
    title: vine.string().maxLength(255),
    content: vine.string(),
    status: vine.enum(['draft', 'published', 'archived']),
  }

  // Field permissions are controlled by the policy.

  // -- Query Configuration --
  static $allowedFilters = ['status', 'user_id']
  static $allowedSorts = ['created_at', 'title', 'updated_at']
  static $defaultSort = '-created_at'
  static $allowedIncludes = ['user', 'comments']
  static $allowedSearch = ['title', 'content']

  // -- Relationships --
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => Comment)
  declare comments: HasMany<typeof Comment>
}
```

:::tip LuminaModel
`LuminaModel` extends `BaseModel` and includes `HasLumina`, `HasValidation`, `HidableColumns`, and `HasAutoScope` out of the box. Open the base class to see all available properties with types, defaults, and examples.

For additional features, use `compose()` on top of `LuminaModel`:
```ts
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import { compose } from '@adonisjs/core/helpers'
import { HasAuditTrail } from '@startsoft/lumina-adonis/mixins/has_audit_trail'
import { BelongsToOrganization } from '@startsoft/lumina-adonis/mixins/belongs_to_organization'

export default class Post extends compose(LuminaModel, HasAuditTrail, BelongsToOrganization) {
  // ...
}
```
:::

Register it in `config/lumina.ts`:

```ts
models: {
  posts: () => import('#models/post'),
},
```

That is all you need. You now have a full REST API for posts:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/posts` | List with filters, sorts, search, pagination |
| `POST` | `/api/posts` | Create with validation |
| `GET` | `/api/posts/:id` | Show single record with relationships |
| `PUT` | `/api/posts/:id` | Update with validation |
| `DELETE` | `/api/posts/:id` | Soft delete |
| `GET` | `/api/posts/trashed` | List soft-deleted records |
| `POST` | `/api/posts/:id/restore` | Restore soft-deleted record |
| `DELETE` | `/api/posts/:id/force-delete` | Permanent delete |

:::tip Multi-Tenant Routes
When using a `tenant` route group with a parameterized prefix, all tenant routes are prefixed with `:organization`:

```
GET /api/:organization/posts
POST /api/:organization/posts
```

See [Route Groups](./route-groups) for configuration details.
:::

## Authentication Endpoints

Lumina also provides auth routes out of the box:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login, returns API token |
| `POST` | `/api/auth/logout` | Revoke all tokens |
| `POST` | `/api/auth/password/recover` | Send password reset email |
| `POST` | `/api/auth/password/reset` | Reset password with token |
| `POST` | `/api/auth/register` | Register via invitation token |

## Run Migrations

```bash
node ace migration:run
```

This will create the necessary tables for audit logs, invitations, and any model tables you have defined.

## Next Steps

- [Request Lifecycle](./request-lifecycle) -- how requests flow through the pipeline
- [Model Configuration](./models) -- mixins, properties, relationships
- [Route Groups](./route-groups) -- multi-tenant, admin, public, and custom route groups
- [Validation](./validation) -- VineJS schemas and policy-driven field permissions
- [Querying](./querying) -- filters, sorts, search, pagination, includes
- [Policies](./policies) -- role-based authorization and permissions
