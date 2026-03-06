# Lumina AdonisJS Server — Policies (Skill)

You are a senior software engineer specialized in **Lumina**, an AdonisJS package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **AdonisJS (TypeScript)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's policy-based authorization system for AdonisJS: the `ResourcePolicy` base class, static `resourceSlug` property, async policy methods for each CRUD action, the permission format (`{slug}.{action}`), wildcard permissions (`*` and `posts.*`), the `HasPermissions` mixin for the User model, user-level vs. organization-scoped permissions, permission storage and resolution, custom policy overrides, registering policies on models via `$policy`, attribute permissions (`hiddenAttributesForShow`, `permittedAttributesForShow`, `permittedAttributesForCreate`, `permittedAttributesForUpdate`), the `hasRole()` helper, slug resolution, and no-policy behavior.

---

## Documentation

### ResourcePolicy Base Class

The `ResourcePolicy` class provides default implementations for all CRUD authorization methods. Each method checks whether the authenticated user holds the required permission string:

```ts
import { ResourcePolicy } from '@startsoft/lumina-adonis/policies/resource_policy'

export default class PostPolicy extends ResourcePolicy {
  static resourceSlug = 'posts'
}
```

With this minimal setup, Lumina automatically checks these permissions:

| Action | Policy Method | Permission Checked |
|--------|--------------|-------------------|
| Index (list) | `viewAny(user)` | `posts.index` |
| Show (single) | `view(user, record)` | `posts.show` |
| Store (create) | `create(user)` | `posts.store` |
| Update | `update(user, record)` | `posts.update` |
| Destroy (delete) | `delete(user, record)` | `posts.destroy` |
| Trashed (list deleted) | `viewTrashed(user)` | `posts.trashed` |
| Restore | `restore(user, record)` | `posts.restore` |
| Force Delete | `forceDelete(user, record)` | `posts.forceDelete` |

### Permission Format

Permissions follow the pattern `{resource_slug}.{action}`:

- `posts.index` -- can list posts
- `posts.store` -- can create posts
- `blogs.update` -- can update blogs
- `comments.destroy` -- can delete comments

The `resource_slug` matches the key you use in `config/lumina.ts` when registering models:

```ts
// config/lumina.ts
models: {
  posts: () => import('#models/post'),       // slug = 'posts'
  'blog-posts': () => import('#models/blog_post'),  // slug = 'blog-posts'
}
```

### Wildcard Support

Permissions support two levels of wildcards:

- `*` -- grants access to **everything** across all resources and all actions
- `posts.*` -- grants access to **all actions** on the `posts` resource

```ts
// Full admin access
const isAdmin = await user.hasPermission('*', organization)

// All post actions
const hasAllPostPerms = await user.hasPermission('posts.*', organization)

// Specific action
const canCreate = await user.hasPermission('posts.store', organization)
```

### HasPermissions Mixin

The `HasPermissions` mixin is applied to your **User** model and provides the `hasPermission()` and `getRoleSlugForValidation()` methods:

```ts
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { HasPermissions } from '@startsoft/lumina-adonis/mixins/has_permissions'
import UserRole from '#models/user_role'

export default class User extends compose(BaseModel, HasPermissions) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare permissions: string[] | null

  @hasMany(() => UserRole)
  declare userRoles: HasMany<typeof UserRole>
}
```

#### Methods

| Method | Description |
|---|---|
| `hasPermission(permission, organization?)` | Returns `true` if the user has the given permission. With organization: checks `userRoles.permissions`. Without: checks `users.permissions`. |
| `getRoleSlugForValidation(organization?)` | Returns the user's role slug within an organization, used for role-based validation rules. |

### How Permissions Are Stored

Lumina supports two permission sources, used depending on whether the request is organization-scoped or not:

#### User-level permissions (`users.permissions`)

For non-tenant route groups (e.g., `driver`, `admin`, `default`), permissions are stored directly on the `users` table as a JSON column:

```
id | name         | email              | permissions (JSON)
1  | Alice Driver | alice@example.com  | ["trips.index", "trips.show", "trucks.*"]
2  | Bob Admin    | bob@example.com    | ["*"]
3  | Carol User   | carol@example.com  | ["posts.index", "posts.show"]
```

#### Organization-scoped permissions (`userRoles.permissions`)

For the `tenant` route group, permissions are stored on the `userRoles` join table, scoped per organization:

```
id | userId | organizationId | permissions (JSON)
1  | 1      | 1              | ["*"]
2  | 2      | 1              | ["posts.index", "posts.show", "posts.store"]
3  | 1      | 2              | ["posts.index", "posts.show"]
```

This enables multi-tenant permission models where the same user can hold different permissions in different organizations.

#### Permission Resolution

When `hasPermission(permission, organization?)` is called:

1. **Organization present** (tenant route group) -- checks `userRoles.permissions` for that organization
2. **No organization** (any other route group) -- checks `users.permissions` directly

This is deterministic -- the decision is based on the presence of an organization in the request. There is no fallback chain.

The `permissions` property can be either a JSON string or a plain array of permission strings:

```json
["posts.index", "posts.show", "posts.store", "comments.*"]
```

### Custom Policies

Extend `ResourcePolicy` to add custom authorization logic. Override any method to implement your own checks:

```ts
import { ResourcePolicy } from '@startsoft/lumina-adonis/policies/resource_policy'

export default class PostPolicy extends ResourcePolicy {
  static resourceSlug = 'posts'

  // Only allow the author to update their own posts
  async update(user: any, record: any): Promise<boolean> {
    if (record.userId === user.id) {
      return true
    }
    return super.update(user, record)
  }

  // Restrict deletion to admins only
  async delete(user: any, record: any): Promise<boolean> {
    const isAdmin = await user.hasPermission('*')
    if (isAdmin) {
      return true
    }
    return false
  }

  // Custom logic for viewing trashed records
  async viewTrashed(user: any): Promise<boolean> {
    return this.checkPermission(user, 'trashed')
  }
}
```

You can call `super.methodName()` to compose your custom logic with the default permission check, or call `this.checkPermission(user, action)` directly to perform a permission lookup.

### Registering a Policy

Register your policy on the model via the static `$policy` property:

```ts
export default class Post extends LuminaModel {
  static $policy = () => import('#policies/post_policy')

  // ... model definition
}
```

The `$policy` property can be:

- An async import function (recommended): `() => import('#policies/post_policy')`
- A policy class reference: `PostPolicy`
- A policy instance: `new PostPolicy()`

### Attribute Permissions

Policies control which attributes are visible and writable on a per-user basis through four methods:

#### `hiddenAttributesForShow(user)`

Returns an array of attribute names that should be **hidden** from API responses for this user. These are merged with the base hidden columns and any `$additionalHiddenColumns` on the model.

```ts
import { ResourcePolicy } from '@startsoft/lumina-adonis/policies/resource_policy'

export default class UserPolicy extends ResourcePolicy {
  static resourceSlug = 'users'

  hiddenAttributesForShow(user: any | null): string[] {
    if (!user) {
      return ['email', 'phone', 'api_token']
    }
    if (this.hasRole(user, 'admin')) {
      return []
    }
    return ['api_token']
  }
}
```

#### `permittedAttributesForShow(user)`

Returns an array of attribute names the user is allowed to **see** in API responses. Acts as a whitelist -- only listed attributes are returned. Return `['*']` (default) to allow all attributes.

```ts
permittedAttributesForShow(user: any | null): string[] {
  if (!user) return ['title', 'body']
  if (this.hasRole(user, 'admin')) return ['*']
  return ['title', 'body', 'status']
}
```

#### `permittedAttributesForCreate(user)`

Returns an array of attribute names the user is allowed to **send** when creating a record. Fields not in this list trigger a **403 Forbidden** response. Return `['*']` (default) to allow all attributes.

```ts
permittedAttributesForCreate(user: any | null): string[] {
  if (!user) return []
  if (this.hasRole(user, 'admin')) return ['*']
  return ['title', 'body']
}
```

#### `permittedAttributesForUpdate(user)`

Returns an array of attribute names the user is allowed to **send** when updating a record. Fields not in this list trigger a **403 Forbidden** response. Return `['*']` (default) to allow all attributes.

```ts
permittedAttributesForUpdate(user: any | null): string[] {
  if (!user) return []
  if (this.hasRole(user, 'admin')) return ['*']
  return ['title', 'body']
}
```

#### `hasRole(user, roleSlug)`

A helper method available in all policies for checking the user's role:

```ts
permittedAttributesForCreate(user: any | null): string[] {
  if (!user) return []
  return this.hasRole(user, 'admin') ? ['*'] : ['title', 'content']
}
```

When `permittedAttributesForShow` returns a non-wildcard list and `hiddenAttributesForShow` also hides some of those fields, the **blacklist wins** -- fields in both lists are hidden.

### No Policy Behavior

If a model does not define a `$policy` property, **all actions are allowed**. This is useful during development or for public resources. Once you are ready to add authorization, create a policy and register it on the model.

### Slug Resolution

The `resourceSlug` static property on the policy tells Lumina which permission prefix to use. If you do not set it, Lumina attempts to resolve the slug automatically by matching the model class against the `models` map in `config/lumina.ts`.

```ts
// Explicit slug (recommended)
export default class PostPolicy extends ResourcePolicy {
  static resourceSlug = 'posts'
}

// Auto-resolved from config (works, but explicit is clearer)
export default class PostPolicy extends ResourcePolicy {
  // Lumina resolves 'posts' from config/lumina.ts models map
}
```

Always set `resourceSlug` explicitly on your policy classes to avoid ambiguity and make permissions easy to audit.

---

## Frequently Asked Questions

**Q: How do I create a minimal policy for my model?**

A: Create a class extending `ResourcePolicy` with just the `resourceSlug`, and register it on your model:

```ts
// app/policies/post_policy.ts
import { ResourcePolicy } from '@startsoft/lumina-adonis/policies/resource_policy'

export default class PostPolicy extends ResourcePolicy {
  static resourceSlug = 'posts'
}
```

```ts
// app/models/post.ts
export default class Post extends LuminaModel {
  static $policy = () => import('#policies/post_policy')
}
```

This checks `posts.index`, `posts.store`, `posts.show`, etc. permissions automatically for every action.

**Q: How do wildcards work in permissions?**

A: There are two wildcard levels:

- `*` -- grants access to everything (all resources, all actions). This is a "super admin" permission.
- `posts.*` -- grants access to all actions on the `posts` resource only.

Both are checked automatically by the `ResourcePolicy` base class when evaluating `hasPermission()`.

**Q: How do I allow a user to only update their own records?**

A: Override the `update` method in your policy to check ownership:

```ts
async update(user: any, record: any): Promise<boolean> {
  if (record.userId === user.id) {
    return true
  }
  // Fall back to permission check for admins
  return super.update(user, record)
}
```

**Q: What happens if a user submits a field they are not permitted to set?**

A: A **403 Forbidden** response is returned before any validation runs:

```json
{
  "message": "Forbidden: you are not allowed to set the following fields: status, priority"
}
```

**Q: How do I make different fields visible to different users?**

A: Use `hiddenAttributesForShow` (blacklist) or `permittedAttributesForShow` (whitelist) in your policy:

```ts
hiddenAttributesForShow(user: any | null): string[] {
  if (this.hasRole(user, 'admin')) return []
  return ['email', 'phone']  // Hide sensitive fields from non-admins
}
```

**Q: Where are permissions stored -- on the user or on a join table?**

A: It depends on the route group:

- **Non-tenant groups** (default, admin, etc.) -- permissions are stored as a JSON array on the `users` table
- **Tenant groups** -- permissions are stored on the `userRoles` join table, scoped per organization

This allows the same user to have different permissions in different organizations.

**Q: What if I do not set `resourceSlug` on my policy?**

A: Lumina attempts to auto-resolve the slug by matching the model class against the `models` map in `config/lumina.ts`. While this works, it is always better to set `resourceSlug` explicitly for clarity and to make permission strings easy to audit.

---

## Real-World Examples

### Example 1: Blog with Author Ownership

```ts
// app/policies/post_policy.ts
import { ResourcePolicy } from '@startsoft/lumina-adonis/policies/resource_policy'

export default class PostPolicy extends ResourcePolicy {
  static resourceSlug = 'posts'

  // Anyone with posts.index can list posts
  // (default behavior from ResourcePolicy)

  // Authors can update their own posts; admins can update any
  async update(user: any, record: any): Promise<boolean> {
    if (record.userId === user.id) {
      return true
    }
    return super.update(user, record)
  }

  // Only admins can delete posts
  async delete(user: any, record: any): Promise<boolean> {
    const isAdmin = await user.hasPermission('*')
    return isAdmin
  }

  // Authors can only set title and content; admins can set everything
  permittedAttributesForCreate(user: any | null): string[] {
    if (!user) return []
    if (this.hasRole(user, 'admin')) return ['*']
    return ['title', 'content']
  }

  permittedAttributesForUpdate(user: any | null): string[] {
    if (!user) return []
    if (this.hasRole(user, 'admin')) return ['*']
    return ['title', 'content', 'status']
  }

  // Hide userId from non-admins
  hiddenAttributesForShow(user: any | null): string[] {
    if (!user) return ['user_id']
    if (this.hasRole(user, 'admin')) return []
    return []
  }
}
```

```ts
// app/models/post.ts
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'

export default class Post extends LuminaModel {
  static $policy = () => import('#policies/post_policy')
  // ... columns and relationships
}
```

### Example 2: Multi-Tenant User Management

```ts
// app/policies/user_policy.ts
import { ResourcePolicy } from '@startsoft/lumina-adonis/policies/resource_policy'

export default class UserPolicy extends ResourcePolicy {
  static resourceSlug = 'users'

  // Only admins can list users
  async viewAny(user: any): Promise<boolean> {
    return this.checkPermission(user, 'index')
  }

  // Users can view themselves; admins can view anyone
  async view(user: any, record: any): Promise<boolean> {
    if (record.id === user.id) return true
    return super.view(user, record)
  }

  // Only admins can create users
  async create(user: any): Promise<boolean> {
    return this.checkPermission(user, 'store')
  }

  // Users can update themselves; admins can update anyone
  async update(user: any, record: any): Promise<boolean> {
    if (record.id === user.id) return true
    return super.update(user, record)
  }

  // Admins see everything; users see limited profile
  permittedAttributesForShow(user: any | null): string[] {
    if (!user) return ['name']
    if (this.hasRole(user, 'admin')) return ['*']
    return ['name', 'email', 'phone']
  }

  // Regular users can only update their profile fields
  permittedAttributesForUpdate(user: any | null): string[] {
    if (!user) return []
    if (this.hasRole(user, 'admin')) return ['*']
    return ['name', 'phone']
  }

  // Hide sensitive fields from non-admins
  hiddenAttributesForShow(user: any | null): string[] {
    if (!user) return ['email', 'phone', 'api_token']
    if (this.hasRole(user, 'admin')) return []
    return ['api_token']
  }
}
```

### Example 3: Read-Only Public Resource with Admin Write Access

```ts
// app/policies/category_policy.ts
import { ResourcePolicy } from '@startsoft/lumina-adonis/policies/resource_policy'

export default class CategoryPolicy extends ResourcePolicy {
  static resourceSlug = 'categories'

  // Everyone can list and view categories
  async viewAny(_user: any): Promise<boolean> {
    return true
  }

  async view(_user: any, _record: any): Promise<boolean> {
    return true
  }

  // Only admins can create, update, or delete
  async create(user: any): Promise<boolean> {
    const isAdmin = await user.hasPermission('*')
    return isAdmin
  }

  async update(user: any, _record: any): Promise<boolean> {
    const isAdmin = await user.hasPermission('*')
    return isAdmin
  }

  async delete(user: any, _record: any): Promise<boolean> {
    const isAdmin = await user.hasPermission('*')
    return isAdmin
  }

  permittedAttributesForCreate(user: any | null): string[] {
    if (!user) return []
    return this.hasRole(user, 'admin') ? ['name', 'slug', 'description'] : []
  }

  permittedAttributesForUpdate(user: any | null): string[] {
    if (!user) return []
    return this.hasRole(user, 'admin') ? ['name', 'slug', 'description'] : []
  }
}
```
