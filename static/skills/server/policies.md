# Lumina Laravel Server — Policies & Permissions (Skill)

You are a senior software engineer specialized in **Lumina**, a Laravel package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **Laravel (PHP)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's authorization system: `ResourcePolicy`, permission format, wildcards, permission storage (user-level vs org-scoped), attribute permissions (read/write), include authorization, custom policy methods, and error responses.

---

## Documentation

### How Policies Work

Every CRUD request triggers a policy check before the action executes:
1. Request comes in (e.g., `POST /api/posts`)
2. Laravel resolves `PostPolicy` automatically
3. Matching method called (e.g., `create()`)
4. `ResourcePolicy` checks `hasPermission('posts.store')`
5. If allowed → action proceeds. If denied → 403 Forbidden.

### ResourcePolicy

Base class for all Lumina policies. Provides default CRUD authorization:

| API Action | Policy Method | Permission Checked |
|---|---|---|
| `GET /posts` | `viewAny()` | `posts.index` |
| `GET /posts/{id}` | `view()` | `posts.show` |
| `POST /posts` | `create()` | `posts.store` |
| `PUT /posts/{id}` | `update()` | `posts.update` |
| `DELETE /posts/{id}` | `delete()` | `posts.destroy` |
| `GET /posts/trashed` | `viewTrashed()` | `posts.trashed` |
| `POST /posts/{id}/restore` | `restore()` | `posts.restore` |
| `DELETE /posts/{id}/force-delete` | `forceDelete()` | `posts.forceDelete` |

### Creating a Policy

Minimal policy — the base class handles everything:

```php
<?php
namespace App\Policies;

use Lumina\LaravelApi\Policies\ResourcePolicy;

class PostPolicy extends ResourcePolicy
{
    protected $resourceSlug = 'posts';
}
```

### Permission Format

```
{resource_slug}.{action}
```

Examples: `posts.index`, `posts.store`, `blogs.update`, `comments.destroy`

### Wildcard Permissions

| Permission | Meaning |
|---|---|
| `*` | Full access to everything (superadmin) |
| `posts.*` | All actions on posts |
| `posts.index` | Exact match only |

### How Permissions Are Stored

**User-level** (non-tenant routes): stored as JSON on `users.permissions`

```
id | name  | permissions (JSON)
1  | Alice | ["trips.index", "trips.show", "trucks.*"]
2  | Bob   | ["*"]
```

**Organization-scoped** (tenant routes): stored in `user_roles` pivot table

```
id | user_id | organization_id | role_id | permissions (JSON)
1  | 1       | 1               | 1       | ["*"]
2  | 2       | 1               | 2       | ["posts.index", "posts.show"]
```

Resolution: org present → checks `user_roles.permissions`; no org → checks `users.permissions`.

### Attribute Permissions

#### Read (Field Visibility)

```php
class UserPolicy extends ResourcePolicy
{
    public function permittedAttributesForShow(?Authenticatable $user): array
    {
        if ($user?->hasRole('admin')) return ['*'];
        return ['id', 'name', 'avatar'];
    }

    public function hiddenAttributesForShow(?Authenticatable $user): array
    {
        if ($user?->hasRole('admin')) return [];
        return ['stripe_id', 'internal_notes'];
    }
}
```

#### Write (Field Permissions)

```php
class PostPolicy extends ResourcePolicy
{
    public function permittedAttributesForCreate(?Authenticatable $user): array
    {
        if ($this->hasRole($user, 'admin')) return ['*'];
        return ['title', 'content'];
    }

    public function permittedAttributesForUpdate(?Authenticatable $user): array
    {
        if ($this->hasRole($user, 'admin')) return ['*'];
        return ['title', 'content'];
    }
}
```

Forbidden fields → 403:
```json
{
    "message": "You are not allowed to set the following field(s): status, is_published"
}
```

### Include Authorization

`?include=comments` triggers a check for `comments.index` permission. Denied → 403.

### Custom Policy Methods

```php
class PostPolicy extends ResourcePolicy
{
    // Only allow users to update their own posts
    public function update(?Authenticatable $user, $post): bool
    {
        if ($user->hasPermission('*')) return true;
        return parent::update($user, $post) && $post->user_id === $user->id;
    }

    // Only allow deletion within 24 hours
    public function delete(?Authenticatable $user, $post): bool
    {
        if ($user->hasPermission('*')) return true;
        return parent::delete($user, $post) && $post->created_at->diffInHours(now()) < 24;
    }
}
```

Always call `parent::methodName()` to preserve base permission checks.

---

## Frequently Asked Questions

**Q: How do I create a basic policy?**

A: Extend `ResourcePolicy` and set the resource slug:

```php
class PostPolicy extends ResourcePolicy
{
    protected $resourceSlug = 'posts';
}
```

That's it. The parent class handles all CRUD authorization automatically.

**Q: How do I set up different roles with different permissions?**

A: Create roles and assign permissions:

```php
$admin = Role::create(['name' => 'Admin', 'slug' => 'admin', 'permissions' => ['*']]);
$editor = Role::create(['name' => 'Editor', 'slug' => 'editor', 'permissions' => [
    'posts.index', 'posts.show', 'posts.store', 'posts.update',
    'comments.*',
]]);
$viewer = Role::create(['name' => 'Viewer', 'slug' => 'viewer', 'permissions' => [
    'posts.index', 'posts.show',
]]);
```

Then assign users to organizations with a role via `UserRole`.

**Q: How do I restrict users to only edit their own records?**

A: Override the policy method:

```php
public function update(?Authenticatable $user, $post): bool
{
    if ($user->hasPermission('*')) return true;
    return parent::update($user, $post) && $post->user_id === $user->id;
}
```

**Q: How do I hide sensitive fields from non-admin users?**

A: Use `hiddenAttributesForShow()` in your policy:

```php
public function hiddenAttributesForShow(?Authenticatable $user): array
{
    if ($user?->hasRole('admin')) return [];
    return ['salary', 'ssn', 'bank_account'];
}
```

**Q: Can a user have different permissions in different organizations?**

A: Yes! Permissions are per-organization via the `user_roles` table. A user can be admin in Org A and viewer in Org B:

```php
$user->hasPermission('posts.store', $orgA); // true (admin)
$user->hasPermission('posts.store', $orgB); // false (viewer)
```

---

## Real-World Examples

### Example 1: Non-Tenant App Permissions

```php
$admin->update(['permissions' => ['*']]);
$editor->update(['permissions' => [
    'posts.index', 'posts.show', 'posts.store', 'posts.update',
    'comments.*',
]]);
$viewer->update(['permissions' => ['posts.index', 'posts.show']]);
```

### Example 2: Hybrid App (Tenant + Driver + Admin)

```php
// Driver: user-level permissions
$driver->update(['permissions' => ['trips.index', 'trips.show', 'trucks.*']]);

// Organization member: org-scoped permissions
UserRole::create([
    'user_id' => $user->id,
    'organization_id' => $org->id,
    'role_id' => $admin->id,
    'permissions' => ['*'],
]);
```

### Example 3: Custom Time-Based Delete Restriction

```php
class PostPolicy extends ResourcePolicy
{
    public function delete(?Authenticatable $user, $post): bool
    {
        if ($user->hasPermission('*')) return true;

        // Regular users can only delete within 24 hours of creation
        return parent::delete($user, $post)
            && $post->created_at->diffInHours(now()) < 24;
    }
}
```
