# Lumina AdonisJS Server — Route Groups (Skill)

You are a senior software engineer specialized in **Lumina**, an AdonisJS package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **AdonisJS (TypeScript)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's route groups system: configuring `routeGroups` in `defineConfig()`, reserved group names (`tenant` and `public`), model selection (`'*'` vs array), route naming conventions, registration order for literal vs parameterized prefixes, building hybrid platforms with multiple route groups, and permission resolution based on route group context.

---

## Documentation

### Configuration

Define route groups in `config/lumina.ts` using `defineConfig()`:

```ts
import { defineConfig } from '@startsoft/lumina-adonis'

export default defineConfig({
  models: {
    posts: () => import('#models/post'),
    comments: () => import('#models/comment'),
    categories: () => import('#models/category'),
  },

  routeGroups: {
    tenant: {
      prefix: ':organization',
      middleware: ['lumina:resolveOrg'],
      models: '*',
    },
    admin: {
      prefix: 'admin',
      middleware: [],
      models: '*',
    },
    public: {
      prefix: 'public',
      middleware: [],
      models: ['categories'],
    },
  },

  multiTenant: {
    organizationIdentifierColumn: 'slug',
  },
})
```

### Route Group Structure

Each route group has three properties:

| Property | Type | Description |
|----------|------|-------------|
| `prefix` | `string` | URL prefix for all routes in this group (e.g., `':organization'`, `'admin'`, `''`) |
| `middleware` | `string[]` | Middleware to apply to all routes in this group |
| `models` | `'*' \| string[]` | `'*'` for all registered models, or an array of specific model slugs |

### Reserved Group Names

Two group names have special behavior:

**`tenant`** -- Lumina detects this name and:
- Registers invitation CRUD routes under the tenant prefix
- Registers the nested operations endpoint under the tenant prefix
- The middleware (e.g., `lumina:resolveOrg`) sets `ctx.organization`, enabling automatic organization scoping

**`public`** -- Lumina detects this name and:
- Skips the `auth` middleware for all routes in this group

Any other group name (e.g., `'driver'`, `'admin'`, `'default'`) is treated as a standard authenticated group.

### Route Naming

All routes are named with the pattern `lumina.{groupKey}.{modelSlug}.{action}`:

```
lumina.tenant.posts.index
lumina.tenant.posts.store
lumina.admin.posts.show
lumina.public.categories.index
```

### Registration Order

Route groups with literal prefixes (e.g., `admin`, `public`) are registered **before** groups with parameterized prefixes (containing `:`, e.g., `:organization`). This prevents parameterized routes from capturing requests meant for literal prefixes.

For example, with both `admin` and `:organization` groups, `/api/admin/posts` correctly hits the admin group instead of treating `admin` as an organization slug.

### Model Selection

Use `'*'` to expose all registered models through a route group:

```ts
routeGroups: {
  tenant: {
    prefix: ':organization',
    middleware: ['lumina:resolveOrg'],
    models: '*', // All models get tenant routes
  },
},
```

Use an array to expose only specific models:

```ts
routeGroups: {
  public: {
    prefix: 'public',
    middleware: [],
    models: ['categories', 'tags'], // Only these models get public routes
  },
},
```

### Organization Scoping Behavior

Organization scoping is implicit, based on the middleware stack:

- **Organization present** (set by middleware like `lumina:resolveOrg`): scoping is applied automatically.
- **Organization absent** (no middleware sets it): scoping is skipped, query returns all records.

This means:
- `tenant` group routes get org scoping automatically (their middleware sets the org on the context).
- Non-tenant group routes skip org scoping naturally (no middleware sets an org).
- **No configuration flag needed** -- the behavior is implicit based on the middleware stack.

### Custom Scoping for Non-Tenant Groups

For non-tenant groups (e.g., `driver`, `admin`), custom data filtering is implemented at the application level using AdonisJS model scopes:

```ts
// app/models/trip.ts
import { scope } from '@adonisjs/lucid/orm'

export default class Trip extends LuminaModel {
  @scope()
  public static forDriver(
    query: ModelQueryBuilderContract<typeof Trip>,
    ctx: HttpContext
  ) {
    if (ctx.routeGroup === 'driver') {
      query.where('driver_id', ctx.auth.user!.driverId)
    }
  }
}
```

### Permission Resolution

Two permission sources are used, determined by the route group context:

| Route Group | Permission Source | Description |
|-------------|------------------|-------------|
| `'tenant'` | `userRoles.permissions` | Organization-scoped, checked per-org |
| Any other | `users.permissions` | User-level, checked directly on the user model |

The decision is deterministic based on the presence of an organization in the request context. There is no fallback chain.

---

## Frequently Asked Questions

**Q: How do I create a simple non-tenant API with route groups?**

A: Use a single `default` route group with an empty prefix:

```ts
routeGroups: {
  default: {
    prefix: '',
    middleware: [],
    models: '*',
  },
},
```

This generates routes like `GET /api/posts`, `POST /api/posts`, etc. All routes require authentication.

**Q: How do I make some endpoints public (no authentication)?**

A: Use the reserved `public` group name. Lumina automatically skips the `auth` middleware for this group:

```ts
routeGroups: {
  public: {
    prefix: 'public',
    middleware: [],
    models: ['categories', 'tags'],
  },
  tenant: {
    prefix: ':organization',
    middleware: ['lumina:resolveOrg'],
    models: '*',
  },
},
```

Now `GET /api/public/categories` requires no authentication, while `GET /api/:organization/posts` does.

**Q: What is the naming convention for generated routes?**

A: Routes follow the pattern `lumina.{groupKey}.{modelSlug}.{action}`. For example:

```
lumina.tenant.posts.index    -> GET /api/:organization/posts
lumina.tenant.posts.store    -> POST /api/:organization/posts
lumina.admin.posts.show      -> GET /api/admin/posts/:id
lumina.public.categories.index -> GET /api/public/categories
```

**Q: Why are my parameterized routes catching requests for literal prefixes?**

A: Lumina automatically handles this by registering literal prefix groups (e.g., `admin`, `public`) before parameterized groups (e.g., `:organization`). Make sure your literal routes use plain strings as prefixes, not parameters.

**Q: How do I expose a model in multiple route groups?**

A: Simply include the model in multiple groups. Each group generates its own set of routes:

```ts
routeGroups: {
  tenant: {
    prefix: ':organization',
    middleware: ['lumina:resolveOrg'],
    models: '*',
  },
  admin: {
    prefix: 'admin',
    middleware: [],
    models: ['posts', 'users'],
  },
},
```

The `posts` model now has both `/api/:organization/posts` (tenant-scoped) and `/api/admin/posts` (global) routes.

**Q: How does permission checking differ between tenant and non-tenant groups?**

A: For the `tenant` route group, permissions are checked against the user's organization-scoped role (`userRoles.permissions`). For any other group, permissions are checked directly on the user model (`users.permissions`). This is determined by the presence of an organization in the request context.

**Q: Where do the invitation and nested operation routes get registered?**

A: They are registered under the `tenant` route group specifically. The `tenant` name is reserved for this purpose. If you have a `tenant` group with prefix `:organization`, invitations are at `/api/:organization/invitations` and nested operations at `/api/:organization/nested`.

---

## Real-World Examples

### Hybrid Platform: Customer + Driver + Admin + Public

```ts
// config/lumina.ts
import { defineConfig } from '@startsoft/lumina-adonis'

export default defineConfig({
  models: {
    trips: () => import('#models/trip'),
    trucks: () => import('#models/truck'),
    materials: () => import('#models/material'),
    categories: () => import('#models/category'),
  },

  routeGroups: {
    // Customer dashboard -- org-scoped
    tenant: {
      prefix: ':organization',
      middleware: ['lumina:resolveOrg'],
      models: '*',
    },
    // Driver app -- authenticated, not org-scoped
    driver: {
      prefix: 'driver',
      middleware: [],
      models: ['trips', 'trucks'],
    },
    // Admin panel -- authenticated, global access
    admin: {
      prefix: 'admin',
      middleware: [],
      models: '*',
    },
    // Public API -- no auth
    public: {
      prefix: 'public',
      middleware: [],
      models: ['materials', 'categories'],
    },
  },

  multiTenant: {
    organizationIdentifierColumn: 'slug',
  },
})
```

Generated routes:

| Group | URL Pattern | Auth | Org Scoped |
|-------|-------------|------|------------|
| tenant | `/api/:organization/trips` | Yes | Yes |
| tenant | `/api/:organization/materials` | Yes | Yes |
| driver | `/api/driver/trips` | Yes | No |
| driver | `/api/driver/trucks` | Yes | No |
| admin | `/api/admin/trips` | Yes | No |
| admin | `/api/admin/materials` | Yes | No |
| public | `/api/public/materials` | No | No |
| public | `/api/public/categories` | No | No |

### Multi-Tenant with Public Read-Only Catalog

```ts
// config/lumina.ts
import { defineConfig } from '@startsoft/lumina-adonis'

export default defineConfig({
  models: {
    products: () => import('#models/product'),
    orders: () => import('#models/order'),
    categories: () => import('#models/category'),
  },

  routeGroups: {
    tenant: {
      prefix: ':organization',
      middleware: ['lumina:resolveOrg'],
      models: ['products', 'orders'],
    },
    public: {
      prefix: 'public',
      middleware: [],
      models: ['categories', 'products'],
    },
  },

  multiTenant: {
    organizationIdentifierColumn: 'slug',
  },
})
```

In this setup, `products` has both tenant-scoped endpoints (for org members to manage) and public endpoints (for unauthenticated browsing). The public routes have no organization scoping.

### Single-Tenant Application with Admin Backdoor

```ts
// config/lumina.ts
import { defineConfig } from '@startsoft/lumina-adonis'

export default defineConfig({
  models: {
    posts: () => import('#models/post'),
    users: () => import('#models/user'),
    settings: () => import('#models/setting'),
  },

  routeGroups: {
    default: {
      prefix: '',
      middleware: [],
      models: ['posts'],
    },
    admin: {
      prefix: 'admin',
      middleware: [],
      models: '*',
    },
  },
})
```

Regular users access `GET /api/posts`. Admin users access `GET /api/admin/posts`, `GET /api/admin/users`, and `GET /api/admin/settings`. Both require authentication, but policy logic can differentiate admin access.
