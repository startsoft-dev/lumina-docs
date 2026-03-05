---
sidebar_position: 5
title: Policies
---

# Policies & Permissions

Lumina uses [Pundit](https://github.com/varvet/pundit) to authorize every API action. Rather than writing authorization logic by hand for each resource, Lumina provides a base `ResourcePolicy` class that automatically checks permissions against the authenticated user's role. All you need to do is create a policy class that extends it.

## How Policies Work

Every time a CRUD request hits a Lumina-generated endpoint, the corresponding policy method is invoked before the action executes. The flow looks like this:

1. A request comes in (e.g., `POST /api/posts`).
2. Lumina resolves the policy for the `Post` model (looks for `PostPolicy`).
3. The matching policy method is called (e.g., `create?`).
4. The base `ResourcePolicy` checks whether the authenticated user has the required permission (e.g., `posts.store`).
5. If the user has the permission, the action proceeds. If not, a `403 Forbidden` response is returned.

:::info
Policy resolution follows naming conventions. A `Post` model automatically resolves to `PostPolicy`. If no specific policy is found, Lumina falls back to `Lumina::ResourcePolicy`.
:::

## ResourcePolicy

`ResourcePolicy` is the base class that all Lumina policies extend. It provides default implementations for every CRUD action, each of which delegates to a permission check using the resource slug and action name.

**Action to Policy Method to Permission mapping:**

| API Action | Policy Method | Permission Checked |
|---|---|---|
| `GET /posts` (index) | `index?` / `view_any?` | `posts.index` |
| `GET /posts/{id}` (show) | `show?` / `view?` | `posts.show` |
| `POST /posts` (store) | `create?` | `posts.store` |
| `PUT /posts/{id}` (update) | `update?` | `posts.update` |
| `DELETE /posts/{id}` (destroy) | `destroy?` / `delete?` | `posts.destroy` |
| `GET /posts/trashed` | `view_trashed?` | `posts.trashed` |
| `POST /posts/{id}/restore` | `restore?` | `posts.restore` |
| `DELETE /posts/{id}/force-delete` | `force_delete?` | `posts.forceDelete` |

Each method in `ResourcePolicy` calls `has_permission?` on the authenticated user with the corresponding permission string. You never need to write this logic yourself unless you want to customize it.

## Creating a Policy

A minimal policy requires no method implementations at all. The base class handles everything:

```ruby
# app/policies/post_policy.rb
class PostPolicy < Lumina::ResourcePolicy
  # The resource slug used for permission checks
  # If not set, auto-resolved from Lumina.config
  self.resource_slug = 'posts'
end
```

That is the entire policy. The `ResourcePolicy` parent class checks `has_permission?` automatically for every CRUD action. If the user has the matching permission, the action is allowed. If not, it is denied.

:::tip
If your resource slug in `Lumina.configure` matches what would be auto-resolved, you can omit the `resource_slug` assignment entirely. It is only needed when you want to override the default.
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

Wildcards are checked hierarchically. When `has_permission?('posts.store')` is called, the system checks for an exact match first, then for `posts.*`, and finally for `*`.

:::warning
The `*` wildcard grants unrestricted access to every resource and every action. Only assign it to fully trusted administrator roles.
:::

## How Permissions Are Stored

Permissions are stored in the `roles` table as a JSON column. Each user is assigned a role per organization through the `user_roles` join table.

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

Define your roles in a seed file or migration:

```ruby
# db/seeds.rb
admin = Role.create!(
  name: 'Admin',
  slug: 'admin',
  permissions: ['*']
)

editor = Role.create!(
  name: 'Editor',
  slug: 'editor',
  permissions: [
    'posts.index', 'posts.show', 'posts.store', 'posts.update',
    'comments.*',
  ]
)

viewer = Role.create!(
  name: 'Viewer',
  slug: 'viewer',
  permissions: [
    'posts.index', 'posts.show',
    'comments.index', 'comments.show',
  ]
)
```

### 2. Assign Users to Roles

Link a user to a role within a specific organization:

```ruby
# Assign user as admin in organization
UserRole.create!(
  user_id: user.id,
  organization_id: organization.id,
  role_id: admin.id
)
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

## Attribute Permissions

Beyond action-level authorization, policies control **which fields** a user can read and write. This gives you fine-grained control over field visibility and writability on a per-role basis.

### Field Visibility (Read)

Two methods control which fields are included in API responses:

- **`permitted_attributes_for_show(user)`** — a whitelist of fields the user can see. Return `['*']` to allow all fields.
- **`hidden_attributes_for_show(user)`** — a blacklist of fields to hide. This is merged with the whitelist, so fields listed here are always removed from responses.

```ruby
class UserPolicy < Lumina::ResourcePolicy
  self.resource_slug = 'users'

  def permitted_attributes_for_show(user)
    if has_role?(user, 'admin')
      ['*']  # Admins see everything
    else
      ['id', 'name', 'avatar']  # Others see limited fields
    end
  end

  def hidden_attributes_for_show(user)
    if has_role?(user, 'admin')
      []
    else
      ['stripe_id', 'internal_notes']  # Always hidden for non-admins
    end
  end
end
```

When `permitted_attributes_for_show` returns a specific list (not `['*']`), all columns not in the list are automatically hidden from API responses. The `hidden_attributes_for_show` blacklist is then merged on top, ensuring those fields are removed even if they appear in the whitelist.

:::info
Both methods receive `nil` when there is no authenticated user. Always handle the `nil` case.
:::

### Field Permissions (Write)

Two methods control which fields a user can submit on create and update requests:

- **`permitted_attributes_for_create(user)`** — fields the user can submit when creating a resource.
- **`permitted_attributes_for_update(user)`** — fields the user can submit when updating a resource.

Return `['*']` to allow all fields, or return a specific list to restrict access.

```ruby
class PostPolicy < Lumina::ResourcePolicy
  self.resource_slug = 'posts'

  def permitted_attributes_for_create(user)
    if has_role?(user, 'admin')
      ['*']  # Admins can set any field
    else
      ['title', 'content']  # Others can only set title and content
    end
  end

  def permitted_attributes_for_update(user)
    if has_role?(user, 'admin')
      ['*']
    else
      ['title', 'content']
    end
  end
end
```

When a user submits fields they are not permitted to set, the API returns a **403 Forbidden** response that explicitly names the forbidden fields:

```json
{
    "message": "You are not allowed to set the following field(s): status, is_published"
}
```

:::info
Forbidden fields are explicitly rejected with a `403` response, not silently ignored. This makes it clear to the client exactly which fields caused the authorization failure.
:::

### Using `has_role?` Helper

The `has_role?(user, role_slug)` method is available in all policies that extend `Lumina::ResourcePolicy`. It checks whether the given user holds the specified role in the current organization context.

```ruby
class PostPolicy < Lumina::ResourcePolicy
  self.resource_slug = 'posts'

  def permitted_attributes_for_create(user)
    if has_role?(user, 'admin')
      ['*']
    elsif has_role?(user, 'editor')
      ['title', 'content', 'excerpt', 'category_id']
    else
      ['title', 'content']
    end
  end

  def permitted_attributes_for_update(user)
    if has_role?(user, 'admin')
      ['*']
    elsif has_role?(user, 'editor')
      ['title', 'content', 'excerpt', 'category_id']
    else
      ['title', 'content']
    end
  end
end
```

Use `has_role?` in any attribute permission method to branch logic based on the user's role. The helper handles `nil` users gracefully, returning `false` when no user is authenticated.

## Include Authorization

When a request uses the `?include` query parameter to eager-load relationships, Lumina performs an additional authorization check. It verifies that the authenticated user has `index` permission on the included resource before loading it.

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

```ruby
# User is admin in Org A
user.has_permission?('posts.store', org_a)  # true

# Same user is viewer in Org B
user.has_permission?('posts.store', org_b)  # false
```

The organization context is automatically resolved from the current request in Lumina's middleware. When a user makes an API call scoped to a specific organization, the permission check uses the role assigned to that user within that organization.

:::tip
This means you do not need to manually pass the organization when using policies through Lumina's API endpoints. The organization is resolved from the request context (typically via a URL segment or subdomain). The explicit `organization` parameter is only needed when calling `has_permission?` directly in your own code.
:::

## Custom Policy Methods

While the base `ResourcePolicy` handles most cases, you can override any policy method to add custom authorization logic. A common pattern is restricting users to only modify their own records:

```ruby
# app/policies/post_policy.rb
class PostPolicy < Lumina::ResourcePolicy
  self.resource_slug = 'posts'

  # Only allow users to update their own posts (unless admin)
  def update?
    if user.has_permission?('*')
      true
    else
      super && record.user_id == user.id
    end
  end
end
```

In this example, the `update?` method first checks if the user is a superadmin (has the `*` permission). If not, it calls the parent method to verify the user has `posts.update` permission **and** checks that the post belongs to the user. Both conditions must be true for the update to proceed.

You can apply this pattern to any policy method:

```ruby
# Only allow viewing unpublished posts if user is the author
def show?
  return false unless super

  if !record.is_published && record.user_id != user.id
    return false
  end

  true
end

# Only allow deletion within 24 hours of creation
def destroy?
  if user.has_permission?('*')
    return true
  end

  super && record.created_at > 24.hours.ago
end
```

:::tip
Always call `super` in your overrides to preserve the base permission check. Skipping the parent call means the permission system is bypassed for that action.
:::

## Error Responses

When authorization fails for any reason — missing permission, failed custom logic, or unauthenticated access — Lumina returns a standard error response:

```json
{
    "message": "This action is unauthorized."
}
```

**HTTP status:** `403 Forbidden`

If the user is not authenticated at all and the route requires authentication, the auth middleware returns:

```json
{
    "message": "Unauthenticated."
}
```

**HTTP status:** `401 Unauthorized`
