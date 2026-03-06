# Lumina Rails Server — Policies & Permissions (Skill)

You are a senior software engineer specialized in **Lumina**, a Rails gem that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **Rails (Ruby)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's authorization system built on Pundit: `Lumina::ResourcePolicy`, permission format and wildcards, permission storage (user-level vs organization-scoped), attribute permissions for read and write, include authorization, custom policy methods, the `has_role?` helper, and error responses.

---

## Documentation

### How Policies Work

Every time a CRUD request hits a Lumina-generated endpoint, the corresponding policy method is invoked before the action executes:

1. A request comes in (e.g., `POST /api/posts`)
2. Lumina resolves the policy for the `Post` model (looks for `PostPolicy`)
3. The matching policy method is called (e.g., `create?`)
4. The base `Lumina::ResourcePolicy` checks whether the authenticated user has the required permission (e.g., `posts.store`)
5. If the user has the permission, the action proceeds. If not, a `403 Forbidden` response is returned

Policy resolution follows naming conventions. A `Post` model automatically resolves to `PostPolicy`. If no specific policy is found, Lumina falls back to `Lumina::ResourcePolicy`.

### ResourcePolicy

`Lumina::ResourcePolicy` is the base class that all Lumina policies extend. It provides default implementations for every CRUD action, each of which delegates to a permission check using the resource slug and action name.

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

Each method calls `has_permission?` on the authenticated user with the corresponding permission string. You never need to write this logic yourself unless you want to customize it.

### Creating a Policy

A minimal policy requires no method implementations at all. The base class handles everything:

```ruby
# app/policies/post_policy.rb
class PostPolicy < Lumina::ResourcePolicy
  # The resource slug used for permission checks
  # If not set, auto-resolved from Lumina.config
  self.resource_slug = 'posts'
end
```

That is the entire policy. The `Lumina::ResourcePolicy` parent class checks `has_permission?` automatically for every CRUD action. If the user has the matching permission, the action is allowed. If not, it is denied.

If your resource slug in `Lumina.configure` matches what would be auto-resolved, you can omit the `resource_slug` assignment entirely.

### Permission Format

Permissions follow a consistent dot-notation format:

```
{resource_slug}.{action}
```

**Examples:**

- `posts.index` -- can list posts
- `posts.show` -- can view a single post
- `posts.store` -- can create posts
- `posts.update` -- can update posts
- `posts.destroy` -- can delete posts
- `posts.trashed` -- can view soft-deleted posts
- `posts.restore` -- can restore soft-deleted posts
- `posts.forceDelete` -- can permanently delete posts

### Wildcard Permissions

Lumina supports wildcard permissions for broad access grants:

| Permission | Meaning |
|---|---|
| `*` | Full access to everything (superadmin) |
| `posts.*` | All actions on posts (read, write, delete, trash, restore, etc.) |
| `posts.index` | Exact match -- only the list action on posts |

Wildcards are checked hierarchically. When `has_permission?('posts.store')` is called, the system checks for an exact match first, then for `posts.*`, and finally for `*`.

The `*` wildcard grants unrestricted access to every resource and every action. Only assign it to fully trusted administrator roles.

### How Permissions Are Stored

Lumina supports two permission sources, used depending on whether the request is organization-scoped or not:

**User-level permissions (`users.permissions`)**

For non-tenant route groups (e.g., `:driver`, `:admin`, `:default`), permissions are stored directly on the `users` table as a JSON column:

```
id | name         | email              | permissions (JSON)
1  | Alice Driver | alice@example.com  | ["trips.index", "trips.show", "trucks.*"]
2  | Bob Admin    | bob@example.com    | ["*"]
3  | Carol User   | carol@example.com  | ["posts.index", "posts.show"]
```

**Organization-scoped permissions (`roles.permissions` via `user_roles`)**

For the `:tenant` route group, permissions are stored on the `roles` table and linked per-organization via the `user_roles` join table:

```
roles table:
id | name    | slug    | permissions (JSON)
1  | Admin   | admin   | ["*"]
2  | Editor  | editor  | ["posts.index", "posts.show", "posts.store", "posts.update", "comments.*"]
3  | Viewer  | viewer  | ["posts.index", "posts.show"]

user_roles table:
id | user_id | organization_id | role_id
1  | 1       | 1               | 1        (user 1 is admin in org 1)
2  | 2       | 1               | 2        (user 2 is editor in org 1)
3  | 1       | 2               | 2        (user 1 is editor in org 2)
```

**Resolution:** When `has_permission?` is called:
1. **Organization present** (tenant route group) -- checks `roles.permissions` for that organization via `user_roles`
2. **No organization** (any other route group) -- checks `users.permissions` directly

### Attribute Permissions

Beyond action-level authorization, policies control **which fields** a user can read and write.

**Field Visibility (Read)**

Two methods control which fields are included in API responses:

- `permitted_attributes_for_show(user)` -- a whitelist of fields the user can see. Return `['*']` to allow all fields.
- `hidden_attributes_for_show(user)` -- a blacklist of fields to hide. This is merged with the whitelist.

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

Both methods receive `nil` when there is no authenticated user. Always handle the `nil` case.

**Field Permissions (Write)**

Two methods control which fields a user can submit on create and update requests:

- `permitted_attributes_for_create(user)` -- fields the user can submit when creating a resource
- `permitted_attributes_for_update(user)` -- fields the user can submit when updating a resource

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

When a user submits fields they are not permitted to set, the API returns a **403 Forbidden** response:

```json
{
    "message": "You are not allowed to set the following field(s): status, is_published"
}
```

Forbidden fields are explicitly rejected with a `403` response, not silently ignored.

### Using `has_role?` Helper

The `has_role?(user, role_slug)` method is available in all policies that extend `Lumina::ResourcePolicy`. It checks whether the given user holds the specified role in the current organization context:

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
end
```

The helper handles `nil` users gracefully, returning `false` when no user is authenticated.

### Include Authorization

When a request uses the `?include` query parameter to eager-load relationships, Lumina verifies that the authenticated user has `index` permission on the included resource:

```
GET /api/posts?include=comments
```

Lumina checks whether the user has `comments.index` permission. If not:

```json
{
    "message": "You do not have permission to include comments."
}
```

This applies to all includes, including nested ones. A request like `?include=comments.author` checks permissions on both the comments resource and the author resource.

### Custom Policy Methods

Override any policy method to add custom authorization logic. A common pattern is restricting users to only modify their own records:

```ruby
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
end
```

Always call `super` in your overrides to preserve the base permission check.

### Error Responses

When authorization fails:

```json
{
    "message": "This action is unauthorized."
}
```

**HTTP status:** `403 Forbidden`

If the user is not authenticated and the route requires authentication:

```json
{
    "message": "Unauthenticated."
}
```

**HTTP status:** `401 Unauthorized`

---

## Frequently Asked Questions

**Q: How do I create a basic policy?**

A: Extend `Lumina::ResourcePolicy` and set the resource slug:

```ruby
class PostPolicy < Lumina::ResourcePolicy
  self.resource_slug = 'posts'
end
```

That is the entire policy. The parent class handles all CRUD authorization automatically.

**Q: How do I set up different roles with different permissions?**

A: Create roles and assign permissions:

```ruby
admin = Role.create!(name: 'Admin', slug: 'admin', permissions: ['*'])
editor = Role.create!(name: 'Editor', slug: 'editor', permissions: [
  'posts.index', 'posts.show', 'posts.store', 'posts.update',
  'comments.*',
])
viewer = Role.create!(name: 'Viewer', slug: 'viewer', permissions: [
  'posts.index', 'posts.show',
])
```

Then assign users to organizations with a role via `UserRole`.

**Q: How do I restrict users to only edit their own records?**

A: Override the policy method and call `super`:

```ruby
def update?
  return true if user.has_permission?('*')
  super && record.user_id == user.id
end
```

**Q: How do I hide sensitive fields from non-admin users?**

A: Use `hidden_attributes_for_show` in your policy:

```ruby
def hidden_attributes_for_show(user)
  if has_role?(user, 'admin')
    []
  else
    ['salary', 'ssn', 'bank_account']
  end
end
```

**Q: Can a user have different permissions in different organizations?**

A: Yes. Permissions are per-organization via the `user_roles` and `roles` tables. A user can be admin in Org A and viewer in Org B:

```ruby
user.has_permission?('posts.store', org_a)  # true (admin role)
user.has_permission?('posts.store', org_b)  # false (viewer role)
```

**Q: What is the difference between `permitted_attributes_for_show` and `hidden_attributes_for_show`?**

A: They are complementary approaches:
- `permitted_attributes_for_show` is a **whitelist** -- only listed fields are returned
- `hidden_attributes_for_show` is a **blacklist** -- listed fields are removed

Use whichever is more convenient. If you define both, both are applied (whitelist first, then blacklist on top).

**Q: How are permissions checked for soft-delete actions?**

A: The `view_trashed?`, `restore?`, and `force_delete?` methods are automatically provided by `Lumina::ResourcePolicy`. They check `posts.trashed`, `posts.restore`, and `posts.forceDelete` respectively. Override them the same way as any other policy method.

---

## Real-World Examples

### Example 1: Non-Tenant App with User-Level Permissions

```ruby
# Assign permissions directly to users
admin.update!(permissions: ['*'])

editor.update!(permissions: [
  'posts.index', 'posts.show', 'posts.store', 'posts.update',
  'comments.*',
])

viewer.update!(permissions: [
  'posts.index', 'posts.show',
  'comments.index', 'comments.show',
])
```

| Action | Admin | Editor | Viewer |
|---|---|---|---|
| List posts | Yes | Yes | Yes |
| View post | Yes | Yes | Yes |
| Create post | Yes | Yes | No |
| Update post | Yes | Yes | No |
| Delete post | Yes | No | No |

### Example 2: Multi-Tenant App with Organization-Scoped Permissions

```ruby
# 1. Create roles
admin = Role.create!(name: 'Admin', slug: 'admin', permissions: ['*'])
editor = Role.create!(name: 'Editor', slug: 'editor', permissions: [
  'posts.index', 'posts.show', 'posts.store', 'posts.update', 'comments.*',
])

# 2. Assign user to organization with role
UserRole.create!(
  user_id: user.id,
  organization_id: organization.id,
  role_id: admin.id
)

# 3. Check permissions
user.has_permission?('posts.store', org_a)   # true
user.has_permission?('posts.store', org_b)   # false (different role)
```

### Example 3: Full Policy with All Attribute Methods

```ruby
class PostPolicy < Lumina::ResourcePolicy
  self.resource_slug = 'posts'

  # -- Read permissions --
  def permitted_attributes_for_show(user)
    if has_role?(user, 'admin')
      ['*']
    else
      ['id', 'title', 'excerpt', 'status', 'published_at', 'user_id', 'category_id']
    end
  end

  def hidden_attributes_for_show(user)
    if has_role?(user, 'admin')
      []
    else
      ['internal_notes', 'revenue_share']
    end
  end

  # -- Write permissions --
  def permitted_attributes_for_create(user)
    if has_role?(user, 'admin')
      ['*']
    elsif has_role?(user, 'editor')
      ['title', 'content', 'excerpt', 'category_id', 'tags']
    else
      ['title', 'content']
    end
  end

  def permitted_attributes_for_update(user)
    if has_role?(user, 'admin')
      ['*']
    elsif has_role?(user, 'editor')
      ['title', 'content', 'excerpt', 'category_id', 'tags']
    else
      ['title', 'content']
    end
  end

  # -- Custom action restrictions --
  def update?
    return true if user.has_permission?('*')
    super && record.user_id == user.id
  end

  def destroy?
    return true if user.has_permission?('*')
    super && record.user_id == user.id && record.created_at > 24.hours.ago
  end
end
```
