# Lumina AdonisJS Server — Getting Started (Skill)

You are a senior software engineer specialized in **Lumina**, an AdonisJS package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **AdonisJS (TypeScript)** version of Lumina.

---

## What This Skill Covers

This skill covers the initial setup and installation of Lumina on an AdonisJS v6 project: requirements, installation via npm and `node ace configure`, the `config/lumina.ts` configuration file with `defineConfig()`, registering models with lazy imports, the auto-generated REST endpoints, authentication routes, running migrations, and environment variables.

---

## Documentation

### Requirements

- Node.js 20+
- AdonisJS v6 application
- npm or yarn

### Installation

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

After configuration, run migrations:

```bash
node ace migration:run
```

This creates the necessary tables for audit logs, invitations, and any model tables you have defined.

### Configuration

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

### Environment Variables

Add these to your `.env` file as needed:

```env
# Invitation expiration (days)
INVITATION_EXPIRES_DAYS=7
```

### Registering a Model

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

`LuminaModel` extends `BaseModel` and includes `HasLumina`, `HasValidation`, `HidableColumns`, and `HasAutoScope` out of the box.

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

Register the model in `config/lumina.ts` using a lazy import:

```ts
models: {
  posts: () => import('#models/post'),
},
```

### Generated REST Endpoints

Once a model is registered, Lumina auto-generates all CRUD endpoints:

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

When using a `tenant` route group with a parameterized prefix, all tenant routes are prefixed with `:organization`:

```
GET /api/:organization/posts
POST /api/:organization/posts
```

### Authentication Endpoints

Lumina provides auth routes out of the box:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login, returns API token |
| `POST` | `/api/auth/logout` | Revoke all tokens |
| `POST` | `/api/auth/password/recover` | Send password reset email |
| `POST` | `/api/auth/password/reset` | Reset password with token |
| `POST` | `/api/auth/register` | Register via invitation token |

---

## Frequently Asked Questions

**Q: How do I install Lumina on my AdonisJS project?**

A: Two commands and you are set:

```bash
npm install @startsoft/lumina-adonis
node ace configure @startsoft/lumina-adonis
```

The configure command is interactive -- it walks you through publishing the config, enabling multi-tenancy, audit trail, etc. After that, run `node ace migration:run` and you are good to go.

**Q: How do I add a new resource/model to the API?**

A: Three steps:

1. Create a model extending `LuminaModel`
2. Register it in `config/lumina.ts` under the `models` object with a lazy import
3. Run `node ace migration:run` if you have a new migration

That is it -- Lumina auto-generates all CRUD endpoints, validation, and authorization for you.

**Q: What does `LuminaModel` give me out of the box?**

A: `LuminaModel` extends Lucid's `BaseModel` via `compose()` and includes these mixins automatically:

- `HasLumina` -- Query builder DSL (`$allowedFilters`, `$allowedSorts`, etc.)
- `HasValidation` -- VineJS type/format validation with policy-driven field permissions
- `HidableColumns` -- Dynamic column hiding from API responses
- `HasAutoScope` -- Auto-discovery of scope classes

You can add more mixins like `HasAuditTrail` or `BelongsToOrganization` via `compose()` when needed.

**Q: Why do models use lazy imports like `() => import('#models/post')`?**

A: Lazy imports ensure models are loaded on demand rather than all at once at boot time. This improves startup performance and avoids circular dependency issues. The `#models/post` syntax uses AdonisJS subpath imports.

**Q: How do I make endpoints public (no authentication)?**

A: Use a `public` route group in your `config/lumina.ts`:

```ts
routeGroups: {
  public: {
    prefix: '',
    middleware: [],
    models: ['posts'],  // These endpoints skip auth middleware
  },
},
```

**Q: What does `defineConfig()` do?**

A: `defineConfig()` merges your configuration values with sensible defaults. You only need to specify the properties you want to override. It provides full TypeScript type checking and autocompletion for your config file.

**Q: Can I use yarn instead of npm?**

A: Yes. Simply replace `npm install` with `yarn add`:

```bash
yarn add @startsoft/lumina-adonis
node ace configure @startsoft/lumina-adonis
```

---

## Real-World Examples

### Example 1: Blog API from Scratch

```bash
# Install Lumina
npm install @startsoft/lumina-adonis
node ace configure @startsoft/lumina-adonis

# Create a Post model and migration
node ace make:model post -m

# Run migrations
node ace migration:run
```

```ts
// app/models/post.ts
import { DateTime } from 'luxon'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import vine from '@vinejs/vine'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import User from '#models/user'

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

  static $validationSchema = {
    title: vine.string().maxLength(255),
    content: vine.string(),
    status: vine.enum(['draft', 'published', 'archived']),
  }

  static $allowedFilters = ['status', 'user_id']
  static $allowedSorts = ['created_at', 'title']
  static $defaultSort = '-created_at'
  static $allowedIncludes = ['user']
  static $allowedSearch = ['title', 'content']

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
```

```ts
// config/lumina.ts
import { defineConfig } from '@startsoft/lumina-adonis'

export default defineConfig({
  models: {
    posts: () => import('#models/post'),
  },
})
```

Now you have: `GET /api/posts`, `POST /api/posts`, `PUT /api/posts/:id`, `DELETE /api/posts/:id` -- all with validation, filtering, sorting, search, and pagination.

### Example 2: Multi-Tenant SaaS Setup

```ts
// config/lumina.ts
import { defineConfig } from '@startsoft/lumina-adonis'

export default defineConfig({
  models: {
    projects: () => import('#models/project'),
    tasks: () => import('#models/task'),
  },
  routeGroups: {
    tenant: {
      prefix: ':organization',
      middleware: ['resolveOrganization'],
      models: '*',
    },
  },
  multiTenant: {
    organizationIdentifierColumn: 'slug',
  },
})
```

```ts
// app/models/project.ts
import { column } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import { BelongsToOrganization } from '@startsoft/lumina-adonis/mixins/belongs_to_organization'

export default class Project extends compose(LuminaModel, BelongsToOrganization) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string

  @column()
  declare organizationId: number
}
```

API calls are now org-scoped:

```bash
GET /api/acme-corp/projects    # Only Acme Corp's projects
POST /api/acme-corp/projects   # Creates project under Acme Corp
```

### Example 3: Minimal Config with Defaults

```ts
// config/lumina.ts
import { defineConfig } from '@startsoft/lumina-adonis'

export default defineConfig({
  models: {
    users: () => import('#models/user'),
    posts: () => import('#models/post'),
    comments: () => import('#models/comment'),
    tags: () => import('#models/tag'),
  },
})
```

With `defineConfig()`, all other settings use sensible defaults. This single config gives you full CRUD APIs for four models with zero additional configuration.
