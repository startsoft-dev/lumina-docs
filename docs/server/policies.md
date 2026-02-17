---
sidebar_position: 5
title: Policies
---

# Policies & Permissions

Lumina uses Laravel's built-in policy system to authorize every API action. Rather than writing authorization logic by hand for each resource, Lumina provides a base `ResourcePolicy` class that automatically checks permissions against the authenticated user's role. All you need to do is create a policy class that extends it.

## How Policies Work

Every time a CRUD request hits a Lumina-generated endpoint, the corresponding policy method is invoked before the action executes. The flow looks like this:

1. A request comes in (e.g., `POST /api/posts`).
2. Laravel auto-resolves the policy for the `Post` model using its standard naming convention (`PostPolicy`).
3. The matching policy method is called (e.g., `create()`).
4. The base `ResourcePolicy` checks whether the authenticated user has the required permission (e.g., `posts.store`).
5. If the user has the permission, the action proceeds. If not, a `403 Forbidden` response is returned.

:::info
Policy resolution follows Laravel's conventions. A `Post` model automatically resolves to `App\Policies\PostPolicy`. You do not need to register policies manually as long as you follow this convention.
:::

## ResourcePolicy

`ResourcePolicy` is the base class that all Lumina policies extend. It provides default implementations for every CRUD action, each of which delegates to a permission check using the resource slug and action name.

**Action to Policy Method to Permission mapping:**

| API Action | Policy Method | Permission Checked |
|---|---|---|
| `GET /posts` (index) | `viewAny()` | `posts.index` |
| `GET /posts/{id}` (show) | `view()` | `posts.show` |
| `POST /posts` (store) | `create()` | `posts.store` |
| `PUT /posts/{id}` (update) | `update()` | `posts.update` |
| `DELETE /posts/{id}` (destroy) | `delete()` | `posts.destroy` |
| `GET /posts/trashed` | `viewTrashed()` | `posts.trashed` |
| `POST /posts/{id}/restore` | `restore()` | `posts.restore` |
| `DELETE /posts/{id}/force-delete` | `forceDelete()` | `posts.forceDelete` |

Each method in `ResourcePolicy` calls `hasPermission()` on the authenticated user with the corresponding permission string. You never need to write this logic yourself unless you want to customize it.

## Creating a Policy

A minimal policy requires no method implementations at all. The base class handles everything:

```php
<?php

namespace App\Policies;

use Lumina\LaravelApi\Policies\ResourcePolicy;

class PostPolicy extends ResourcePolicy
{
    // The resource slug used for permission checks
    // If not set, auto-resolved from config/lumina.php
    protected $resourceSlug = 'posts';
}
```

That is the entire policy. The `ResourcePolicy` parent class checks `hasPermission()` automatically for every CRUD action. If the user has the matching permission, the action is allowed. If not, it is denied.

:::tip
If your resource slug in `config/lumina.php` matches what would be auto-resolved (the plural, lowercase, kebab-case form of the model name), you can omit the `$resourceSlug` property entirely. It is only needed when you want to override the default.
:::

## Permission Format

Permissions follow a consistent dot-notation format:

```
{resource_slug}.{action}
```

**Examples:**

- `posts.index` — can list posts
- `posts.show` — can view a single post
- `posts.store` — can create posts
- `posts.update` — can update posts
- `posts.destroy` — can delete posts
- `posts.trashed` — can view soft-deleted posts
- `posts.restore` — can restore soft-deleted posts
- `posts.forceDelete` — can permanently delete posts
- `blogs.index` — can list blogs
- `comments.store` — can create comments

## Wildcard Permissions

Lumina supports wildcard permissions for broad access grants:

| Permission | Meaning |
|---|---|
| `*` | Full access to everything (superadmin) |
| `posts.*` | All actions on posts (read, write, delete, trash, restore, etc.) |
| `posts.index` | Exact match — only the list action on posts |

Wildcards are checked hierarchically. When `hasPermission('posts.store')` is called, the system checks for an exact match first, then for `posts.*`, and finally for `*`.

:::warning
The `*` wildcard grants unrestricted access to every resource and every action. Only assign it to fully trusted administrator roles.
:::

## How Permissions Are Stored

Permissions are stored in the `roles` table as a JSON column. Each user is assigned a role per organization through the `user_roles` pivot table.

**roles table:**

```
id | name    | slug    | permissions (JSON)
1  | Admin   | admin   | ["*"]
2  | Editor  | editor  | ["posts.index", "posts.show", "posts.store", "posts.update", "comments.*"]
3  | Viewer  | viewer  | ["posts.index", "posts.show"]
```

**user_roles table:**

```
id | user_id | organization_id | role_id
1  | 1       | 1               | 1        (user 1 is admin in org 1)
2  | 2       | 1               | 2        (user 2 is editor in org 1)
3  | 1       | 2               | 2        (user 1 is editor in org 2)
```

This structure enables multi-tenant permission models where the same user can hold different roles in different organizations.

## Complete Role Setup Example

### 1. Create Roles

Define your roles in a seeder or migration:

```php
// In a seeder or migration
$admin = Role::create([
    'name' => 'Admin',
    'slug' => 'admin',
    'permissions' => ['*'],
]);

$editor = Role::create([
    'name' => 'Editor',
    'slug' => 'editor',
    'permissions' => [
        'posts.index', 'posts.show', 'posts.store', 'posts.update',
        'comments.*',
    ],
]);

$viewer = Role::create([
    'name' => 'Viewer',
    'slug' => 'viewer',
    'permissions' => [
        'posts.index', 'posts.show',
        'comments.index', 'comments.show',
    ],
]);
```

### 2. Assign Users to Roles

Link a user to a role within a specific organization:

```php
// Assign user as admin in organization
UserRole::create([
    'user_id' => $user->id,
    'organization_id' => $organization->id,
    'role_id' => $admin->id,
]);
```

### 3. What Each Role Can Do

Here is a breakdown of what each role is authorized to perform on the `posts` resource:

| Action | Admin | Editor | Viewer |
|---|---|---|---|
| List posts | Yes | Yes | Yes |
| View post | Yes | Yes | Yes |
| Create post | Yes | Yes | No |
| Update post | Yes | Yes | No |
| Delete post | Yes | No | No |
| View trashed | Yes | No | No |
| Restore | Yes | No | No |
| Force delete | Yes | No | No |

The Admin role has `*`, so every action is allowed. The Editor role has explicit `posts.index`, `posts.show`, `posts.store`, and `posts.update` permissions, so they can read and write but not delete. The Viewer role only has `posts.index` and `posts.show`, restricting them to read-only access.

## Column-Level Visibility

Beyond action-level authorization, policies can control which columns are visible to specific users. This is useful when certain fields (like email addresses, phone numbers, or billing identifiers) should only be visible to administrators.

Implement the `HasHiddenColumns` contract on your policy:

```php
<?php

namespace App\Policies;

use Lumina\LaravelApi\Contracts\HasHiddenColumns;
use Lumina\LaravelApi\Policies\ResourcePolicy;

class UserPolicy extends ResourcePolicy implements HasHiddenColumns
{
    protected $resourceSlug = 'users';

    public function hiddenColumns(?\Illuminate\Contracts\Auth\Authenticatable $user): array
    {
        // Non-admins can't see email or phone
        if (!$user || !$user->hasPermission('*')) {
            return ['email', 'phone', 'stripe_id'];
        }

        return [];
    }
}
```

On the model side, the `HidableColumns` trait checks the policy's `hiddenColumns()` method when serializing the model. The columns returned by `hiddenColumns()` are merged with the model's base `$hidden` array, so those fields are stripped from every API response for that user.

:::info
The `hiddenColumns()` method receives `null` when there is no authenticated user (e.g., public endpoints). Always handle the `null` case to avoid errors.
:::

## Include Authorization

When a request uses the `?include` query parameter to eager-load relationships, Lumina performs an additional authorization check. It verifies that the authenticated user has `viewAny` permission on the included resource before loading it.

**Example request:**

```
GET /api/posts?include=comments
```

Lumina checks whether the user has `comments.index` permission. If the user does not have that permission, the request is rejected with a `403 Forbidden`:

```json
{
    "message": "You do not have permission to include comments."
}
```

This means that even if a user has full access to posts, they cannot eager-load relationships they are not authorized to view. Each included resource is independently authorized.

:::warning
This applies to all includes, including nested ones. A request like `?include=comments.author` checks permissions on both `comments` and the author resource.
:::

## Organization-Scoped Permissions

In multi-tenant applications, permissions are evaluated per organization. A user can hold different roles in different organizations, and permission checks respect this context.

```php
// User is admin in Org A
$user->hasPermission('posts.store', $orgA);  // true

// Same user is viewer in Org B
$user->hasPermission('posts.store', $orgB);  // false
```

The organization context is automatically resolved from the current request in Lumina's middleware. When a user makes an API call scoped to a specific organization, the permission check uses the role assigned to that user within that organization.

:::tip
This means you do not need to manually pass the organization when using policies through Lumina's API endpoints. The organization is resolved from the request context (typically via a header or URL segment). The explicit `$organization` parameter is only needed when calling `hasPermission()` directly in your own code.
:::

## Custom Policy Methods

While the base `ResourcePolicy` handles most cases, you can override any policy method to add custom authorization logic. A common pattern is restricting users to only modify their own records:

```php
<?php

namespace App\Policies;

use Illuminate\Contracts\Auth\Authenticatable;
use Lumina\LaravelApi\Policies\ResourcePolicy;

class PostPolicy extends ResourcePolicy
{
    protected $resourceSlug = 'posts';

    // Only allow users to update their own posts (unless admin)
    public function update(?Authenticatable $user, $post): bool
    {
        if ($user->hasPermission('*')) {
            return true;
        }

        return parent::update($user, $post) && $post->user_id === $user->id;
    }
}
```

In this example, the `update()` method first checks if the user is a superadmin (has the `*` permission). If not, it calls the parent method to verify the user has `posts.update` permission **and** checks that the post belongs to the user. Both conditions must be true for the update to proceed.

You can apply this pattern to any policy method:

```php
// Only allow viewing unpublished posts if user is the author
public function view(?Authenticatable $user, $post): bool
{
    if (!parent::view($user, $post)) {
        return false;
    }

    if (!$post->is_published && $post->user_id !== $user->id) {
        return false;
    }

    return true;
}

// Only allow deletion within 24 hours of creation
public function delete(?Authenticatable $user, $post): bool
{
    if ($user->hasPermission('*')) {
        return true;
    }

    return parent::delete($user, $post)
        && $post->created_at->diffInHours(now()) < 24;
}
```

:::tip
Always call `parent::methodName()` in your overrides to preserve the base permission check. Skipping the parent call means the permission system is bypassed for that action.
:::

## Error Responses

When authorization fails for any reason -- missing permission, failed custom logic, or unauthenticated access -- Lumina returns a standard error response:

```json
{
    "message": "This action is unauthorized."
}
```

**HTTP status:** `403 Forbidden`

If the user is not authenticated at all and the route requires authentication, Laravel's auth middleware returns:

```json
{
    "message": "Unauthenticated."
}
```

**HTTP status:** `401 Unauthorized`
