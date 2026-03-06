# Lumina AdonisJS Server — Multi-Tenancy (Skill)

You are a senior software engineer specialized in **Lumina**, an AdonisJS package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **AdonisJS (TypeScript)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's built-in multi-tenancy system: the `BelongsToOrganization` mixin, automatic organization scoping via middleware (`ResolveOrganizationFromRoute` and `ResolveOrganizationFromSubdomain`), auto-detected organization ownership from `belongsTo` relationships, auto-setting `organizationId` on create, the `scopeForOrganization()` method for manual scoping, and the organization scope precedence rules.

---

## Documentation

### Enabling Multi-Tenancy

Enable multi-tenancy by adding a `tenant` route group in `config/lumina.ts`:

```ts
import { defineConfig } from '@startsoft/lumina-adonis'

export default defineConfig({
  routeGroups: {
    tenant: {
      prefix: ':organization',
      middleware: ['lumina:resolveOrg'],
      models: '*',
    },
  },
  multiTenant: {
    organizationIdentifierColumn: 'slug',
  },
})
```

The `organizationIdentifierColumn` option controls which column is used to look up organizations from the URL parameter or subdomain. Common values are `'id'`, `'slug'`, or `'uuid'`. Default is `'id'`.

### Routing Strategies

#### URL Prefix Mode

Use a parameterized prefix in the `tenant` route group:

```ts
routeGroups: {
  tenant: {
    prefix: ':organization',
    middleware: ['lumina:resolveOrg'],
    models: '*',
  },
},
```

This generates routes like:

```
GET    /api/:organization/posts
POST   /api/:organization/posts
GET    /api/:organization/posts/:id
PUT    /api/:organization/posts/:id
DELETE /api/:organization/posts/:id
```

The `ResolveOrganizationFromRoute` middleware extracts the `:organization` parameter and looks up the Organization model by the configured identifier column.

#### Subdomain Mode

Use the subdomain middleware instead:

```ts
routeGroups: {
  tenant: {
    prefix: '',
    middleware: ['lumina:resolveOrgSubdomain'],
    models: '*',
  },
},
```

This generates routes like:

```
GET    https://acme.example.com/api/posts
POST   https://acme.example.com/api/posts
```

The `ResolveOrganizationFromSubdomain` middleware extracts the subdomain (e.g., `acme` from `acme.example.com`) and looks up the organization by the `domain` column first, then by the identifier column. The following subdomains are skipped (treated as non-tenant): `www`, `app`, `api`, `localhost`, `127.0.0.1`.

### ResolveOrganizationFromRoute Middleware

This middleware handles URL-prefix-based tenant resolution:

1. Extracts the `organization` parameter from the route
2. Looks up the Organization model by the configured `organizationIdentifierColumn`
3. Verifies the authenticated user belongs to the organization
4. Sets `ctx.organization` for downstream controllers and policies

```ts
import ResolveOrganizationFromRoute from '@startsoft/lumina-adonis/middleware/resolve_organization_from_route'
```

If the organization is not found, a `404` is returned. If the user does not belong to the organization, a `404` is returned (to avoid leaking the existence of organizations).

### ResolveOrganizationFromSubdomain Middleware

This middleware handles subdomain-based tenant resolution:

1. Extracts the subdomain from the `Host` header (strips port if present)
2. Skips known non-tenant subdomains (`www`, `app`, `api`, `localhost`)
3. Looks up the Organization model by `domain` column or by the identifier column
4. Verifies the authenticated user belongs to the organization
5. Sets `ctx.organization` for downstream consumers

```ts
import ResolveOrganizationFromSubdomain from '@startsoft/lumina-adonis/middleware/resolve_organization_from_subdomain'
```

If the user does not belong to the organization in subdomain mode, a `403` is returned.

### BelongsToOrganization Mixin

The `BelongsToOrganization` mixin provides automatic organization scoping at the model level:

```ts
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { BelongsToOrganization } from '@startsoft/lumina-adonis/mixins/belongs_to_organization'
import Organization from '#models/organization'

export default class Post extends compose(BaseModel, BelongsToOrganization) {
  @column()
  declare organizationId: number

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
```

#### What the Mixin Does

**Auto-sets `organizationId` on create:** A `before:create` hook automatically sets `organizationId` from the current HTTP context (via `ctx.organization.id`). This is skipped if:
- The `organizationId` is already set explicitly
- The code is running outside an HTTP context (e.g., Ace commands, tests, queue workers)

**Global query scope:** The mixin overrides the model's `query()` method to automatically filter by `organization_id` when an HTTP context with an organization is available:

```ts
// Automatically scoped to the current organization
const posts = await Post.query().where('status', 'published')
// SQL: SELECT * FROM posts WHERE organization_id = ? AND status = 'published'
```

**Manual scoping with `scopeForOrganization()`:** For contexts outside of HTTP requests (background jobs, admin tools), use the static `scopeForOrganization()` method:

```ts
const posts = await Post.query()
  .apply((scopes) => Post.scopeForOrganization(scopes, organization))
```

Or directly:

```ts
Post.scopeForOrganization(query, organization)
```

The global organization scope is skipped when running in a console context (e.g., Ace commands, tests, queue workers) since there is no HTTP request context available.

### Nested Organization Scoping (Auto-Detected)

Not every model has a direct `organization_id` column. For nested models, Lumina automatically walks `belongsTo` relationships to find the nearest model that holds the organization reference. No explicit configuration is needed:

```ts
export default class Comment extends compose(BaseModel, HasLumina, BelongsToOrganization) {
  // Organization path is auto-detected: Comment -> post -> organization
  @column()
  declare postId: number

  @belongsTo(() => Post)
  declare post: BelongsTo<typeof Post>
}
```

Lumina traverses `Comment -> post` to find the organization using a nested `whereHas` call:

```sql
SELECT * FROM comments
WHERE EXISTS (
  SELECT 1 FROM posts WHERE posts.id = comments.post_id AND posts.organization_id = ?
)
```

Deep nesting is also auto-detected (e.g., `Reply -> comment -> post -> organization`).

### Organization Scope Precedence

The `ResourcesController` applies organization scoping using the following order of precedence:

1. **Resource IS the Organization model** -- restrict to the current org's primary key
2. **Model has `scopeForOrganization` static method** -- delegate to the custom scope
3. **Model has `organization_id` column** -- simple `WHERE organization_id = ?`
4. **Auto-detected `belongsTo` chain** -- Lumina walks `belongsTo` relationships to find a model with `organization_id`
5. **Model has `organization` or `organizations` relationship** -- use `whereHas`
6. **No relationship found** -- model is global (no scope applied)

### Auto-Setting Organization on Create

When creating a record via `POST /api/:organization/posts`, the controller automatically adds `organization_id` to the data if:
- An organization is present in the request context (set by middleware)
- The model has an `organizationId` or `organization_id` column

This happens in the controller layer, independent of the `BelongsToOrganization` mixin. Using both provides defense-in-depth.

### Membership Verification

Both middleware classes verify that the authenticated user belongs to the resolved organization. The check supports three strategies in order:

1. **Lucid relationship query** -- `user.related('organizations').query().where('organizations.id', org.id)`
2. **Preloaded organizations array** -- checks `user.organizations` for a matching id
3. **Explicit helper method** -- calls `user.belongsToOrganization(org)` if defined

If none of these strategies find a match, the middleware denies access.

---

## Frequently Asked Questions

**Q: How do I enable multi-tenancy in Lumina?**

A: Add a `tenant` route group with the `lumina:resolveOrg` middleware in `config/lumina.ts`:

```ts
export default defineConfig({
  routeGroups: {
    tenant: {
      prefix: ':organization',
      middleware: ['lumina:resolveOrg'],
      models: '*',
    },
  },
  multiTenant: {
    organizationIdentifierColumn: 'slug',
  },
})
```

All models listed under the tenant group will be automatically scoped to the resolved organization.

**Q: How do I scope a model that does not have a direct `organization_id` column?**

A: Lumina auto-detects the path by walking `belongsTo` relationships. Just define the relationship:

```ts
export default class Comment extends compose(BaseModel, HasLumina, BelongsToOrganization) {
  @column()
  declare postId: number

  @belongsTo(() => Post)
  declare post: BelongsTo<typeof Post>
}
```

Lumina traverses Comment -> post -> organization automatically.

**Q: How do I query organization-scoped models in background jobs or Ace commands?**

A: Use the `scopeForOrganization()` static method, since there is no HTTP context available:

```ts
const org = await Organization.findOrFail(orgId)
const posts = await Post.query()
  .apply((scopes) => Post.scopeForOrganization(scopes, org))
```

**Q: What happens if my model has no organization relationship at all?**

A: The model is treated as global -- no organization scope is applied. This is step 6 of the precedence chain. Useful for shared lookup tables like categories or tags.

**Q: Can I use subdomain-based tenancy instead of URL prefixes?**

A: Yes. Use the `lumina:resolveOrgSubdomain` middleware and an empty prefix:

```ts
routeGroups: {
  tenant: {
    prefix: '',
    middleware: ['lumina:resolveOrgSubdomain'],
    models: '*',
  },
},
```

The middleware extracts the subdomain from the `Host` header and resolves the organization.

**Q: Does the `BelongsToOrganization` mixin automatically set the organization on new records?**

A: Yes. A `before:create` hook sets `organizationId` from `ctx.organization.id` automatically. Additionally, the controller layer also injects `organization_id` during create operations. Both layers work together for defense-in-depth.

**Q: How does Lumina verify that a user belongs to an organization?**

A: The middleware checks three strategies in order: (1) a Lucid relationship query on the user's `organizations` relation, (2) a preloaded `user.organizations` array, or (3) a `user.belongsToOrganization(org)` helper method. If none match, access is denied.

---

## Real-World Examples

### SaaS Application with Organization-Scoped Projects

```ts
// config/lumina.ts
import { defineConfig } from '@startsoft/lumina-adonis'

export default defineConfig({
  models: {
    projects: () => import('#models/project'),
    tasks: () => import('#models/task'),
    comments: () => import('#models/comment'),
  },
  routeGroups: {
    tenant: {
      prefix: ':organization',
      middleware: ['lumina:resolveOrg'],
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
import { compose } from '@adonisjs/core/helpers'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import { BelongsToOrganization } from '@startsoft/lumina-adonis/mixins/belongs_to_organization'
import Organization from '#models/organization'

export default class Project extends compose(LuminaModel, BelongsToOrganization) {
  @column()
  declare organizationId: number

  @column()
  declare name: string

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
```

```ts
// app/models/task.ts -- organization path auto-detected: Task -> project -> organization
import { compose } from '@adonisjs/core/helpers'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import { BelongsToOrganization } from '@startsoft/lumina-adonis/mixins/belongs_to_organization'
import Project from '#models/project'

export default class Task extends compose(LuminaModel, BelongsToOrganization) {
  @column()
  declare projectId: number

  @column()
  declare title: string

  @belongsTo(() => Project)
  declare project: BelongsTo<typeof Project>
}
```

```ts
// app/models/comment.ts -- auto-detected: Comment -> task -> project -> organization
import { compose } from '@adonisjs/core/helpers'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import { BelongsToOrganization } from '@startsoft/lumina-adonis/mixins/belongs_to_organization'
import Task from '#models/task'

export default class Comment extends compose(LuminaModel, BelongsToOrganization) {
  @column()
  declare taskId: number

  @column()
  declare body: string

  @belongsTo(() => Task)
  declare task: BelongsTo<typeof Task>
}
```

### Subdomain-Based Multi-Tenancy for a White-Label Platform

```ts
// config/lumina.ts
import { defineConfig } from '@startsoft/lumina-adonis'

export default defineConfig({
  models: {
    products: () => import('#models/product'),
    orders: () => import('#models/order'),
  },
  routeGroups: {
    tenant: {
      prefix: '',
      middleware: ['lumina:resolveOrgSubdomain'],
      models: '*',
    },
  },
  multiTenant: {
    organizationIdentifierColumn: 'slug',
  },
})
```

Requests are made to `https://acme.example.com/api/products` -- the subdomain `acme` is resolved to the matching organization.

### Manual Scoping in a Background Job

```ts
// app/jobs/generate_report.ts
import Organization from '#models/organization'
import Post from '#models/post'

export default class GenerateReportJob {
  async handle({ organizationId }: { organizationId: number }) {
    const org = await Organization.findOrFail(organizationId)

    // No HTTP context available, so use manual scoping
    const posts = await Post.query()
      .apply((scopes) => Post.scopeForOrganization(scopes, org))
      .where('status', 'published')

    // Generate report from posts...
  }
}
```
