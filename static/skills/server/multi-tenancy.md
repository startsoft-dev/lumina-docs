# Lumina Laravel Server — Multi-Tenancy (Skill)

You are a senior software engineer specialized in **Lumina**, a Laravel package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **Laravel (PHP)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's multi-tenancy system: enabling it, organization resolution strategies (route prefix vs subdomain), scoping models with `BelongsToOrganization`, nested ownership (auto-detected from BelongsTo), per-organization roles and permissions, and access control.

---

## Documentation

### Enabling Multi-Tenancy

During `php artisan lumina:install`, select Yes for multi-tenant support. Or configure manually:

```php
// config/lumina.php
'route_groups' => [
    'tenant' => [
        'prefix' => '{organization}',
        'middleware' => [\App\Http\Middleware\ResolveOrganizationFromRoute::class],
        'models' => '*',
    ],
],
'multi_tenant' => [
    'organization_identifier_column' => 'slug',
],
```

### How It Works

All routes include the organization:
```
/api/{organization}/posts
/api/{organization}/comments
```

The middleware:
1. Resolves the organization from the URL (or subdomain)
2. Validates it exists (404 if not)
3. Checks the user belongs to that org (404 if not)
4. Scopes all queries automatically

### Organization Resolution Strategies

**Route Prefix (Default):**
```bash
GET /api/acme-corp/posts     # Using slug
GET /api/1/posts             # Using id
GET /api/abc-123-def/posts   # Using uuid
```

**Subdomain:**
```bash
GET https://acme-corp.yourapp.com/api/posts
```

```php
'multi_tenant' => [
    'enabled' => true,
    'use_subdomain' => true,
],
```

Skipped subdomains: `www`, `app`, `api`, `localhost`, `127.0.0.1`.

### Scoping Models

```php
use Lumina\LaravelApi\Traits\BelongsToOrganization;

class Post extends Model
{
    use SoftDeletes, HasValidation, BelongsToOrganization;

    protected $fillable = ['title', 'content', 'organization_id', 'user_id'];
}
```

Migration needs `organization_id`:
```php
$table->foreignId('organization_id')->constrained();
```

### Nested Organization Ownership

For models without a direct `organization_id`, Lumina auto-detects the ownership path by introspecting BelongsTo relationships:

```php
class Comment extends Model
{
    use BelongsToOrganization;
    // Comment → Post → Blog → Organization is auto-detected
}

class Post extends Model
{
    use BelongsToOrganization;
    // Post → Blog → Organization is auto-detected
}

class Blog extends Model
{
    use BelongsToOrganization;
    // Blog has organization_id directly
}
```

Lumina walks the `belongsTo` chain automatically to find the organization.

### Per-Organization Roles

```php
// Create roles
$admin = Role::create(['name' => 'Admin', 'slug' => 'admin', 'permissions' => ['*']]);
$editor = Role::create(['name' => 'Editor', 'slug' => 'editor', 'permissions' => [
    'posts.index', 'posts.show', 'posts.store', 'posts.update', 'comments.*',
]]);

// Assign user to organizations with different roles
UserRole::create([
    'user_id' => $user->id,
    'organization_id' => $acmeCorp->id,
    'role_id' => $admin->id,
]);
UserRole::create([
    'user_id' => $user->id,
    'organization_id' => $otherOrg->id,
    'role_id' => $viewer->id,
]);
```

### Permission Checks

```php
$user->hasPermission('posts.store', $acmeCorp);  // true (admin)
$user->hasPermission('posts.store', $otherOrg);   // false (viewer)
```

### Access Control

- User not in organization → 404 (not 403, to prevent org discovery)
- No authentication → 401
- Public endpoints skip auth via `'public' => ['posts']` in config

---

## Frequently Asked Questions

**Q: How do I enable multi-tenancy?**

A: Run `php artisan lumina:install` and select "Yes" for multi-tenant support. It creates the organizations, roles, and user_roles tables. Or configure it manually in `config/lumina.php` with a `tenant` route group.

**Q: How do I scope my model to an organization?**

A: Two steps:
1. Add `BelongsToOrganization` trait to your model
2. Add `organization_id` column to your migration

```php
class Post extends LuminaModel
{
    use BelongsToOrganization;
}
```

Now all queries are automatically filtered by organization.

**Q: My model doesn't have `organization_id` directly. How do I scope it?**

A: Lumina auto-detects the path from BelongsTo relationships. Just add `BelongsToOrganization`:

```php
class Comment extends LuminaModel
{
    use BelongsToOrganization;
    // Comment → Post → Blog (has org_id) is auto-detected
}
```

**Q: Can a user have different roles in different organizations?**

A: Absolutely. Each `UserRole` entry has a `user_id`, `organization_id`, and `role_id`. One user can be admin in Org A and viewer in Org B.

**Q: Why do I get 404 instead of 403 when accessing an org I don't belong to?**

A: By design. Returning 404 prevents leaking information about which organization slugs exist. Users can't discover valid organizations through error responses.

**Q: How do I use subdomain-based multi-tenancy?**

A: Set `use_subdomain` to `true`:

```php
'multi_tenant' => [
    'enabled' => true,
    'use_subdomain' => true,
],
```

Then requests like `https://acme-corp.yourapp.com/api/posts` will resolve the organization from the subdomain.

---

## Real-World Examples

### Complete Multi-Tenant Setup

```php
// 1. Config
'models' => [
    'posts'    => \App\Models\Post::class,
    'comments' => \App\Models\Comment::class,
],
'multi_tenant' => [
    'enabled' => true,
    'organization_identifier_column' => 'slug',
],
```

```php
// 2. Model
class Post extends LuminaModel
{
    use BelongsToOrganization, HasAuditTrail;

    protected $fillable = ['title', 'content', 'status', 'organization_id', 'user_id'];
    public static $allowedFilters  = ['status', 'user_id'];
    public static $allowedSorts    = ['created_at', 'title'];
}
```

```php
// 3. Seed roles
Role::create(['name' => 'Admin', 'slug' => 'admin', 'permissions' => ['*']]);
Role::create(['name' => 'Editor', 'slug' => 'editor', 'permissions' => [
    'posts.index', 'posts.show', 'posts.store', 'posts.update', 'comments.*',
]]);
Role::create(['name' => 'Viewer', 'slug' => 'viewer', 'permissions' => [
    'posts.index', 'posts.show', 'comments.index', 'comments.show',
]]);
```

```php
// 4. Assign users
$org = Organization::create(['name' => 'Acme Corp', 'slug' => 'acme-corp']);
UserRole::create([
    'user_id' => $admin->id,
    'organization_id' => $org->id,
    'role_id' => Role::where('slug', 'admin')->first()->id,
]);
```

```bash
# 5. Use the API
# Admin: full access
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  -X POST /api/acme-corp/posts \
  -d '{"title": "Hello", "content": "World", "status": "published"}'
# → 201

# Viewer: read only
curl -H "Authorization: Bearer VIEWER_TOKEN" \
  -X POST /api/acme-corp/posts \
  -d '{"title": "Hello"}'
# → 403
```
