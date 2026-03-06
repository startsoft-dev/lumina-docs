---
name: setup-multi-tenancy
description: Configures multi-tenancy for a Lumina application including route strategy, organization resolution middleware, model scoping, and configuration. Use this skill when setting up or modifying how an application isolates data between organizations.
---

# Setup Multi-Tenancy

Configures the complete multi-tenancy setup for a Lumina application, including route strategy, organization resolution, model scoping, and middleware.

## Workflow

### Step 1: Ask Route Strategy

Ask the user:

> How should organizations be identified in API URLs?
>
> **Option A: Route prefix (recommended)**
> URLs include the organization identifier as a path segment:
> - `GET /api/{org-slug}/posts`
> - `POST /api/{org-slug}/posts`
> Uses `ResolveOrganizationFromRoute` middleware.
>
> **Option B: Subdomain**
> URLs use the organization as a subdomain:
> - `GET https://acme.app.com/api/posts`
> - `POST https://acme.app.com/api/posts`
> Uses `ResolveOrganizationFromSubdomain` middleware.

### Step 2: Ask Organization Identifier

Ask the user:

> Which column should identify the organization in URLs?
>
> - `slug` (e.g., `/api/acme/posts`) -- human-readable, recommended
> - `id` (e.g., `/api/1/posts`) -- simple numeric
> - `uuid` (e.g., `/api/550e8400-e29b/posts`) -- universally unique
>
> This must match a column on the `organizations` table.

### Step 3: Configure `config/lumina.php`

Update the `multi_tenant` section in `config/lumina.php`:

**Route prefix strategy:**
```php
'multi_tenant' => [
    'enabled' => true,
    'use_subdomain' => false,
    'organization_identifier_column' => 'slug', // or 'id', 'uuid'
    'middleware' => \Lumina\LaravelApi\Http\Middleware\ResolveOrganizationFromRoute::class,
],
```

**Subdomain strategy:**
```php
'multi_tenant' => [
    'enabled' => true,
    'use_subdomain' => true,
    'organization_identifier_column' => 'domain', // column that stores the subdomain
    'middleware' => \Lumina\LaravelApi\Http\Middleware\ResolveOrganizationFromSubdomain::class,
],
```

### Step 4: Configure Models with Direct Organization Relationship

For models that have an `organization_id` column (direct relationship), add the `BelongsToOrganization` trait:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Lumina\LaravelApi\Traits\HasValidation;
use Lumina\LaravelApi\Traits\HidableColumns;
use Lumina\LaravelApi\Traits\BelongsToOrganization;

class Project extends Model
{
    use HasFactory, SoftDeletes, HasValidation, HidableColumns;
    use BelongsToOrganization;

    protected $fillable = [
        'name',
        'description',
        'organization_id',
    ];

    // The BelongsToOrganization trait automatically:
    // 1. Adds an organization() belongsTo relationship
    // 2. Scopes queries to the current organization
    // 3. Auto-sets organization_id on create
}
```

The migration must include:
```php
$table->foreignId('organization_id')->constrained()->cascadeOnDelete();
```

### Step 5: Verify Indirect Models (Auto-Detected)

For models that belong to an organization through another model (no direct `organization_id` column), Lumina auto-detects the ownership path by introspecting BelongsTo relationships.

```php
class Task extends Model
{
    use HasFactory, SoftDeletes, HasValidation, HidableColumns;

    // Task -> Project -> Organization is auto-detected via BelongsTo
    protected $fillable = ['title', 'project_id'];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
```

```php
class Comment extends Model
{
    use HasFactory, SoftDeletes, HasValidation, HidableColumns;

    // Comment -> Post -> Blog -> Organization is auto-detected via BelongsTo
    protected $fillable = ['body', 'post_id', 'user_id'];

    public function post()
    {
        return $this->belongsTo(Post::class);
    }
}
```

### Step 6: Configure Middleware

**If using the built-in middleware**, no additional setup is needed. The middleware class reference in `config/lumina.php` is applied automatically by the route registration.

**If using a custom middleware**, create it at `app/Http/Middleware/`:

For route prefix:
```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Organization;
use Symfony\Component\HttpFoundation\Response;

class ResolveOrganizationFromRoute
{
    public function handle(Request $request, Closure $next): Response
    {
        $route = $request->route();
        if (!$route || !$route->hasParameter('organization')) {
            return $next($request);
        }

        $organizationIdentifier = $route->parameter('organization');

        if (!$organizationIdentifier) {
            return response()->json(['message' => 'Organization identifier is required'], 400);
        }

        $identifierColumn = config('lumina.multi_tenant.organization_identifier_column', 'id');
        $organization = Organization::where($identifierColumn, $organizationIdentifier)->first();

        if (!$organization) {
            return response()->json(['message' => 'Organization not found'], 404);
        }

        // Verify user belongs to the organization
        $user = $request->user('sanctum');
        if ($user) {
            $userBelongsToOrg = $user->organizations()
                ->where('organizations.id', $organization->id)
                ->exists();

            if (!$userBelongsToOrg) {
                return response()->json(['message' => 'Organization not found'], 404);
            }
        }

        // Set organization in request for downstream use
        $request->merge(['organization' => $organization]);
        $request->attributes->set('organization', $organization);

        return $next($request);
    }
}
```

For subdomain:
```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Organization;
use Symfony\Component\HttpFoundation\Response;

class ResolveOrganizationFromSubdomain
{
    public function handle(Request $request, Closure $next): Response
    {
        $host = $request->getHost();
        $parts = explode('.', $host);

        // Extract subdomain (first part of the host)
        if (count($parts) < 3) {
            return $next($request); // No subdomain
        }

        $subdomain = $parts[0];

        $identifierColumn = config('lumina.multi_tenant.organization_identifier_column', 'domain');
        $organization = Organization::where($identifierColumn, $subdomain)->first();

        if (!$organization) {
            return response()->json(['message' => 'Organization not found'], 404);
        }

        // Verify user belongs to the organization
        $user = $request->user('sanctum');
        if ($user) {
            $userBelongsToOrg = $user->organizations()
                ->where('organizations.id', $organization->id)
                ->exists();

            if (!$userBelongsToOrg) {
                return response()->json(['message' => 'Organization not found'], 404);
            }
        }

        // Set organization in request for downstream use
        $request->merge(['organization' => $organization]);
        $request->attributes->set('organization', $organization);

        return $next($request);
    }
}
```

Then update `config/lumina.php` to reference your custom class:
```php
'middleware' => \App\Http\Middleware\ResolveOrganizationFromRoute::class,
// or
'middleware' => \App\Http\Middleware\ResolveOrganizationFromSubdomain::class,
```

### Step 7: Review All Models

Review every model in `config/lumina.php` and verify each one has proper organization scoping:

| Model | Has `organization_id`? | Strategy | Status |
|-------|----------------------|----------|--------|
| Blog | Yes | `BelongsToOrganization` trait | OK |
| BlogPost | No | Auto-detected via BelongsTo | OK (blog.organization) |
| BlogComment | No | Auto-detected via BelongsTo | OK (blogPost.blog.organization) |
| Task | No | Auto-detected via BelongsTo | OK (verify BelongsTo chain) |

### Step 8: Verify Checklist

- [ ] `config/lumina.php` has `multi_tenant.enabled` set to `true`
- [ ] `config/lumina.php` has `multi_tenant.use_subdomain` set correctly (false for route prefix, true for subdomain)
- [ ] `config/lumina.php` has `multi_tenant.organization_identifier_column` matching the organizations table column
- [ ] `config/lumina.php` has `multi_tenant.middleware` pointing to the correct middleware class
- [ ] Every model with an `organization_id` column uses the `BelongsToOrganization` trait
- [ ] Every model without `organization_id` has a BelongsTo chain leading to the organization (auto-detected)
- [ ] No model is orphaned (every model has either `BelongsToOrganization` or an auto-detectable BelongsTo chain)
- [ ] The Organization model exists with the identifier column
- [ ] The User model has a `rolesInOrganization()` method
- [ ] The User model has an `organizations()` relationship
- [ ] Middleware resolves the organization and sets it on `request()->get('organization')`
- [ ] Middleware verifies user belongs to the organization
- [ ] API routes include the organization prefix or subdomain context
- [ ] Invitation routes are under the organization context (`/{organization}/invitations`)
- [ ] Nested endpoint is under the organization context (`/{organization}/nested`)
