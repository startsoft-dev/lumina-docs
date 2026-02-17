---
sidebar_position: 7
title: Multi-Tenancy
---

# Multi-Tenancy

Lumina supports organization-based data isolation out of the box. Each user can belong to multiple organizations with different roles in each.

## Enabling Multi-Tenancy

During `php artisan lumina:install`, select **Yes** when asked about multi-tenant support. This creates:

- `organizations` table and model
- `roles` table and model
- `user_roles` junction table
- Organization resolution middleware
- Role and organization seeders

Or configure it manually in `config/lumina.php`:

```php
'multi_tenant' => [
    'enabled' => true,
    'use_subdomain' => false,                    // false = URL prefix, true = subdomain
    'organization_identifier_column' => 'slug',  // 'id', 'slug', or 'uuid'
    'middleware' => null,                         // Custom middleware class (optional)
],
```

## How It Works

When multi-tenancy is enabled, all API routes include the organization:

```
/api/{organization}/posts
/api/{organization}/comments
/api/{organization}/users
```

The middleware:

1. Resolves the organization from the URL (or subdomain)
2. Validates the organization exists (404 if not)
3. Checks the authenticated user belongs to that organization (404 if not)
4. Scopes all queries to that organization automatically

## Organization Resolution Strategies

### Route Prefix (Default)

The organization identifier is part of the URL path:

```bash
GET /api/acme-corp/posts       # Using slug
GET /api/1/posts               # Using id
GET /api/abc-123-def/posts     # Using uuid
```

Uses `ResolveOrganizationFromRoute` middleware. The identifier column is configurable:

```php
'organization_identifier_column' => 'slug',  // matches organizations.slug column
```

### Subdomain

The organization is extracted from the subdomain:

```bash
GET https://acme-corp.yourapp.com/api/posts
GET https://other-org.yourapp.com/api/posts
```

Uses `ResolveOrganizationFromSubdomain` middleware. Enable it:

```php
'multi_tenant' => [
    'enabled' => true,
    'use_subdomain' => true,
],
```

:::info Skipped Subdomains
The subdomain middleware automatically skips these common subdomains: `www`, `app`, `api`, `localhost`, `127.0.0.1`. Requests from these are treated as non-tenant.
:::

## Scoping Models

Add `BelongsToOrganization` to scope a model's data per organization:

```php
use Lumina\LaravelApi\Traits\BelongsToOrganization;

class Post extends Model
{
    use SoftDeletes, HasValidation, BelongsToOrganization;

    protected $fillable = ['title', 'content', 'organization_id', 'user_id'];
}
```

Migration:

```php
Schema::create('posts', function (Blueprint $table) {
    $table->id();
    $table->string('title');
    $table->text('content');
    $table->foreignId('organization_id')->constrained();
    $table->foreignId('user_id')->constrained();
    $table->softDeletes();
    $table->timestamps();
});
```

Now `GET /api/acme-corp/posts` only returns posts where `organization_id` matches Acme Corp. The `organization_id` is automatically set when creating records.

### Nested Organization Ownership

Not all models have a direct `organization_id` column. For nested models, use the `$owner` static property to define the path to the organization:

```php
class Comment extends Model
{
    use BelongsToOrganization;

    // Comment → Post → Blog → Organization
    public static string $owner = 'post.blog';

    protected $fillable = ['content', 'post_id', 'user_id'];

    public function post()
    {
        return $this->belongsTo(Post::class);
    }
}
```

```php
class Post extends Model
{
    use BelongsToOrganization;

    // Post → Blog → Organization
    public static string $owner = 'blog';

    public function blog()
    {
        return $this->belongsTo(Blog::class);
    }
}
```

```php
class Blog extends Model
{
    use BelongsToOrganization;

    // Blog has organization_id directly — no $owner needed
    protected $fillable = ['name', 'slug', 'organization_id'];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
```

## Per-Organization Roles

Users have roles scoped to each organization. A user can be **admin** in one organization and **viewer** in another.

### Setting Up Roles

```php
// Create roles
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
    'permissions' => ['posts.index', 'posts.show'],
]);
```

### Assigning Users to Organizations

```php
use App\Models\UserRole;

// User is admin in Acme Corp
UserRole::create([
    'user_id' => $user->id,
    'organization_id' => $acmeCorp->id,
    'role_id' => $admin->id,
]);

// Same user is viewer in Other Org
UserRole::create([
    'user_id' => $user->id,
    'organization_id' => $otherOrg->id,
    'role_id' => $viewer->id,
]);
```

### Checking Permissions

```php
// User is admin in Acme Corp
$user->hasPermission('posts.store', $acmeCorp);  // true
$user->hasPermission('posts.destroy', $acmeCorp); // true (admin has *)

// Same user is viewer in Other Org
$user->hasPermission('posts.store', $otherOrg);   // false
$user->hasPermission('posts.index', $otherOrg);   // true
```

## Access Control

### User Not in Organization

If a user tries to access an organization they don't belong to:

```bash
curl -H "Authorization: Bearer TOKEN" /api/other-org/posts
# → 404 { "message": "Organization not found" }
```

:::info Why 404 and not 403?
Returning 404 instead of 403 prevents leaking information about organization existence. Users can't discover which organization slugs are valid.
:::

### No Authentication

Requests without authentication to non-public endpoints:

```bash
curl /api/acme-corp/posts
# → 401 { "message": "Unauthenticated." }
```

### Public Endpoints

Models listed in the `public` config skip authentication:

```php
// config/lumina.php
'public' => ['posts'],  // /api/{org}/posts doesn't require auth
```

## Full Setup Example

Here's a complete multi-tenant setup from scratch:

### 1. Enable in Config

```php
// config/lumina.php
return [
    'models' => [
        'posts'    => \App\Models\Post::class,
        'comments' => \App\Models\Comment::class,
    ],
    'multi_tenant' => [
        'enabled' => true,
        'organization_identifier_column' => 'slug',
    ],
];
```

### 2. Create Models

```php
// app/Models/Post.php
class Post extends Model
{
    use SoftDeletes, HasValidation, BelongsToOrganization, HasAuditTrail;

    protected $fillable = ['title', 'content', 'status', 'organization_id', 'user_id'];

    public static $allowedFilters  = ['status', 'user_id'];
    public static $allowedSorts    = ['created_at', 'title'];
    public static $defaultSort     = '-created_at';
    public static $allowedIncludes = ['user', 'comments'];
    public static $allowedSearch   = ['title', 'content'];

    protected $validationRules = [
        'title'   => 'string|max:255',
        'content' => 'string',
        'status'  => 'string|in:draft,published',
    ];

    protected $validationRulesStore = [
        'admin'  => ['title' => 'required', 'content' => 'required', 'status' => 'nullable'],
        'editor' => ['title' => 'required', 'content' => 'required'],
        '*'      => ['title' => 'required', 'content' => 'required'],
    ];

    public function user()     { return $this->belongsTo(User::class); }
    public function comments() { return $this->hasMany(Comment::class); }
}
```

### 3. Seed Roles

```php
// database/seeders/RoleSeeder.php
class RoleSeeder extends Seeder
{
    public function run(): void
    {
        Role::create(['name' => 'Admin', 'slug' => 'admin', 'permissions' => ['*']]);
        Role::create(['name' => 'Editor', 'slug' => 'editor', 'permissions' => [
            'posts.index', 'posts.show', 'posts.store', 'posts.update',
            'comments.*',
        ]]);
        Role::create(['name' => 'Viewer', 'slug' => 'viewer', 'permissions' => [
            'posts.index', 'posts.show',
            'comments.index', 'comments.show',
        ]]);
    }
}
```

### 4. Create Organization & Assign Users

```php
$org = Organization::create(['name' => 'Acme Corp', 'slug' => 'acme-corp']);

// Admin user
UserRole::create([
    'user_id' => $admin->id,
    'organization_id' => $org->id,
    'role_id' => Role::where('slug', 'admin')->first()->id,
]);

// Editor user
UserRole::create([
    'user_id' => $editor->id,
    'organization_id' => $org->id,
    'role_id' => Role::where('slug', 'editor')->first()->id,
]);
```

### 5. Use the API

```bash
# Admin: full access
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  -X POST /api/acme-corp/posts \
  -d '{"title": "Hello", "content": "World", "status": "published"}'
# → 201 Created

# Editor: can create but not set status (role-based validation)
curl -H "Authorization: Bearer EDITOR_TOKEN" \
  -X POST /api/acme-corp/posts \
  -d '{"title": "Hello", "content": "World"}'
# → 201 Created

# Viewer: cannot create
curl -H "Authorization: Bearer VIEWER_TOKEN" \
  -X POST /api/acme-corp/posts \
  -d '{"title": "Hello", "content": "World"}'
# → 403 Forbidden
```
