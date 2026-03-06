# Lumina AdonisJS Server — Request Lifecycle (Skill)

You are a senior software engineer specialized in **Lumina**, an AdonisJS package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **AdonisJS (TypeScript)** version of Lumina.

---

## What This Skill Covers

This skill covers the full request lifecycle in Lumina for AdonisJS: the complete pipeline from an incoming HTTP request to the final JSON response, including route matching, auth middleware, route group middleware, organization resolution, model middleware, model resolution via lazy imports, policy-based authorization, organization scoping, VineJS validation, query building (filters, sorts, search, includes, fields, pagination), response serialization, column hiding, error responses, and action exclusion.

---

## Documentation

### Request Flow Overview

Every Lumina API request follows this predictable pipeline:

```
HTTP Request
  -> Route Match (AdonisJS router)
  -> Auth Middleware (skipped for public group)
  -> Route Group Middleware
  -> Model Middleware
  -> ResourcesController
  -> Policy Check (403 if denied)
  -> Organization Scope (tenant group only)
  -> Validation (store/update only)
  -> Query Builder
  -> Response Serialization
  -> JSON Response
```

### Step 1: Route Matching

When you register a model in `config/lumina.ts`, Lumina generates a set of routes automatically. Each route is bound to a specific action on the `ResourcesController`:

| Action | Route | Controller Method |
|--------|-------|-------------------|
| Index | `GET /api/:model` | `index()` |
| Store | `POST /api/:model` | `store()` |
| Show | `GET /api/:model/:id` | `show()` |
| Update | `PUT /api/:model/:id` | `update()` |
| Destroy | `DELETE /api/:model/:id` | `destroy()` |
| Trashed | `GET /api/:model/trashed` | `trashed()` |
| Restore | `POST /api/:model/:id/restore` | `restore()` |
| Force Delete | `DELETE /api/:model/:id/force-delete` | `forceDelete()` |

The model slug and route group key are stored in the route metadata, so the controller knows which model class to resolve. Routes are named `lumina.{group}.{slug}.{action}` (e.g., `lumina.tenant.posts.index`).

### Step 2: Auth Middleware

For route groups other than `public`, the AdonisJS auth middleware runs first. It verifies the API token from the `Authorization: Bearer <token>` header and attaches the authenticated user to `ctx.auth.user`.

Routes in the `public` route group skip this step entirely.

### Step 3: Route Group Middleware and Organization Resolution

Middleware defined in the route group config runs next. For the `tenant` route group, this typically includes one of two organization-resolving middleware classes:

- **`ResolveOrganizationFromRoute`** -- Extracts the `:organization` route parameter and looks up the Organization model by the configured identifier column (`id`, `slug`, or `uuid`). Verifies the authenticated user belongs to the organization.

- **`ResolveOrganizationFromSubdomain`** -- Extracts the subdomain from the `Host` header (e.g., `acme` from `acme.example.com`). Skips known non-tenant subdomains (`www`, `app`, `api`, `localhost`). Looks up by `domain` column first, then by the identifier column.

Both middleware classes set `ctx.organization` for downstream consumers.

### Step 4: Model Middleware

If the model defines `$middleware` or `$middlewareActions`, those middleware names are applied to the appropriate routes during registration:

```ts
import { compose } from '@adonisjs/core/helpers'
import { BaseModel } from '@adonisjs/lucid/orm'
import { HasLumina } from '@startsoft/lumina-adonis/mixins/has_lumina'

export default class Post extends compose(BaseModel, HasLumina) {
  // Applied to all routes for this model
  static $middleware = ['throttle:60,1']

  // Applied only to specific actions
  static $middlewareActions = {
    store: ['verified'],
    destroy: ['admin'],
  }
}
```

### Step 5: Model Resolution

The `ResourcesController` extracts the model slug from the route metadata and uses the `models` map in `config/lumina.ts` to dynamically import the model class:

```ts
const loader = config.models[slug]  // e.g. () => import('#models/post')
const module = await loader()
const modelClass = module.default    // The Lucid model class
```

### Step 6: Authorization (Policy Check)

The controller resolves the policy class from the model's static `$policy` property (if defined) and calls the appropriate policy method:

| Action | Policy Method | Arguments |
|--------|--------------|-----------|
| Index | `viewAny(user, modelClass)` | Model class |
| Show | `view(user, record)` | Loaded record |
| Store | `create(user, modelClass)` | Model class |
| Update | `update(user, record)` | Loaded record |
| Destroy | `delete(user, record)` | Loaded record |
| Trashed | `viewTrashed(user, modelClass)` | Model class |
| Restore | `restore(user, record)` | Loaded record |
| Force Delete | `forceDelete(user, record)` | Loaded record |

If no policy is defined, all actions are allowed.

For `?include=` parameters, the controller also checks `viewAny` permission on each related model's policy. A 403 is returned if the user lacks permission for any requested include.

### Step 7: Organization Scoping

When an organization is present in the request context (set by middleware in the `tenant` route group), the controller applies organization filtering to the query. Non-tenant route groups skip this step. The scoping strategy follows this order of precedence:

1. **Resource IS the Organization model** -- restrict to the current org's primary key
2. **Model has `scopeForOrganization` static method** -- delegate to it
3. **Model has `organization_id` column** -- simple `WHERE organization_id = ?`
4. **Auto-detected `belongsTo` chain** -- Lumina walks `belongsTo` relationships to find a model with `organization_id`
5. **Model has `organization` relationship** -- use `whereHas`
6. **No relationship found** -- model is global (no scope applied)

### Step 8: Validation

For `store` and `update` actions, the controller resolves permitted fields from the policy (`permittedAttributesForCreate` or `permittedAttributesForUpdate`), checks for forbidden fields (returns 403), then calls the model's `validateForAction()` method (provided by the `HasValidation` mixin) for VineJS format validation. If validation fails, a 422 response is returned:

```json
{
  "errors": {
    "title": ["The title field is required."],
    "content": ["The content field must be a string."]
  }
}
```

### Step 9: Query Execution

The `LuminaQueryBuilder` translates URL query parameters into Lucid ORM operations:

1. `applyFilters()` -- `?filter[status]=published`
2. `applySorts()` -- `?sort=-created_at,title`
3. `applySearch()` -- `?search=adonis`
4. `applyIncludes()` -- `?include=user,comments`
5. `applyFields()` -- `?fields[posts]=id,title`
6. `applyPagination()` -- `?page=1&per_page=20`

### Step 10: Response Serialization

The controller returns a JSON response. For paginated results, metadata is sent in response headers:

```
X-Current-Page: 1
X-Last-Page: 10
X-Per-Page: 20
X-Total: 195
```

The response body contains the data array (for index endpoints) or a single object (for show/store/update). Delete operations return a `204 No Content` response.

Hidden columns (from `HidableColumns` mixin, `$additionalHiddenColumns`, and policy `hiddenAttributesForShow`) are stripped from the response automatically. Base hidden columns always include `password`, `rememberToken`, `createdAt`, `updatedAt`, and `deletedAt`.

### Action Exclusion

Models can opt out of specific routes using `$exceptActions`:

```ts
import { compose } from '@adonisjs/core/helpers'
import { BaseModel } from '@adonisjs/lucid/orm'
import { HasLumina } from '@startsoft/lumina-adonis/mixins/has_lumina'

export default class Setting extends compose(BaseModel, HasLumina) {
  // Only allow index and show -- no create, update, or delete
  static $exceptActions = ['store', 'update', 'destroy', 'trashed', 'restore', 'forceDelete']
}
```

Valid action names: `index`, `show`, `store`, `update`, `destroy`, `trashed`, `restore`, `forceDelete`.

### Error Responses

Lumina uses a consistent JSON error format across all actions:

| Status | Meaning | Example |
|--------|---------|---------|
| `403` | Authorization denied | `{ "message": "This action is unauthorized." }` |
| `404` | Resource not found | `{ "message": "Organization not found" }` |
| `422` | Validation failed | `{ "errors": { "title": ["..."] } }` |
| `204` | Success (no content) | Empty body (delete operations) |

---

## Frequently Asked Questions

**Q: What happens if I do not define a policy on my model?**

A: If a model does not define a `$policy` property, all actions are allowed. This is useful during development or for genuinely public resources. Once you are ready to add authorization, create a policy and register it via the static `$policy` property on the model.

**Q: How does Lumina know which model class to use for a request?**

A: The model slug is stored in the route metadata during registration. The `ResourcesController` uses it to look up the lazy import function in `config/lumina.ts` and dynamically imports the model class:

```ts
const loader = config.models[slug]  // e.g. () => import('#models/post')
const module = await loader()
const modelClass = module.default
```

**Q: How does organization scoping work for deeply nested models?**

A: Lumina auto-detects the organization path by walking `belongsTo` relationships. For example, if a `Comment` belongs to a `Post` which has `organization_id`, Lumina automatically scopes queries through that chain -- no configuration needed.

**Q: Can I apply middleware to specific actions only?**

A: Yes. Use `$middlewareActions` on the model:

```ts
export default class Post extends LuminaModel {
  static $middlewareActions = {
    store: ['verified'],
    destroy: ['admin'],
  }
}
```

This applies the `verified` middleware only to the store action and `admin` middleware only to destroy.

**Q: What is the difference between a 403 and a 422 error in Lumina?**

A: A `403 Forbidden` means the user does not have permission to perform the action (or submitted fields they are not allowed to set). A `422 Unprocessable Entity` means the data failed VineJS format validation (e.g., a string exceeds the max length, an enum value is invalid). The 403 check happens before the 422 validation.

**Q: How do I disable specific endpoints for a model?**

A: Use `$exceptActions` to exclude specific routes:

```ts
export default class AuditLog extends LuminaModel {
  // Read-only model -- no create, update, or delete
  static $exceptActions = ['store', 'update', 'destroy', 'trashed', 'restore', 'forceDelete']
}
```

**Q: Does Lumina check include permissions?**

A: Yes. When a request uses `?include=comments`, Lumina checks `viewAny` permission on the comments policy. If the user lacks the `comments.index` permission, a 403 is returned. This applies to all includes, including nested ones like `?include=comments.author`.

---

## Real-World Examples

### Example 1: Tracing a Failed Request

A developer gets a 403 error on `POST /api/posts`. Here is how the request flows:

1. **Route Match** -- AdonisJS matches `POST /api/posts` to `ResourcesController.store()`
2. **Auth Middleware** -- The Bearer token is valid, user is attached to `ctx.auth.user`
3. **Route Group Middleware** -- Default group has no extra middleware, passes through
4. **Model Resolution** -- `posts` slug resolves to `Post` model via lazy import
5. **Policy Check** -- `PostPolicy.create(user)` is called, which checks `posts.store` permission. The user's role does not have this permission. **403 returned here.**

The fix: add `posts.store` to the user's role permissions, or override the `create()` method in `PostPolicy`.

### Example 2: Full Lifecycle for a List Request

```bash
GET /api/acme-corp/posts?filter[status]=published&sort=-created_at&include=user&page=1&per_page=10
```

1. **Route Match** -- Matches `lumina.tenant.posts.index`
2. **Auth Middleware** -- Token verified, user loaded
3. **Route Group Middleware** -- `ResolveOrganizationFromRoute` resolves "acme-corp" to Organization record, sets `ctx.organization`
4. **Policy Check** -- `PostPolicy.viewAny(user)` checks `posts.index` permission. Allowed.
5. **Include Authorization** -- Checks `users.index` permission for the `user` include. Allowed.
6. **Organization Scoping** -- `WHERE organization_id = 1` added to query
7. **Query Builder** -- Applies filter (`status = 'published'`), sort (`ORDER BY created_at DESC`), include (`preload('user')`), pagination (`LIMIT 10 OFFSET 0`)
8. **Response** -- Returns JSON array with pagination headers `X-Total`, `X-Current-Page`, etc.

### Example 3: Read-Only Model Configuration

```ts
// app/models/audit_log.ts
import { DateTime } from 'luxon'
import { column } from '@adonisjs/lucid/orm'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'

export default class AuditLog extends LuminaModel {
  // No create, update, or delete endpoints
  static $exceptActions = ['store', 'update', 'destroy', 'trashed', 'restore', 'forceDelete']

  static $allowedFilters = ['action', 'model_type', 'user_id']
  static $allowedSorts = ['created_at']
  static $defaultSort = '-created_at'
  static $allowedSearch = ['action', 'model_type']

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare action: string

  @column()
  declare modelType: string

  @column()
  declare userId: number

  @column()
  declare changes: Record<string, any>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
```

This produces only `GET /api/audit-logs` and `GET /api/audit-logs/:id` -- a fully read-only API resource.
