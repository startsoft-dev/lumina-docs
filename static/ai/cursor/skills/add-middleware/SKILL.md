---
name: add-middleware
description: Creates a middleware class and assigns it to a Lumina model. Use this skill when you need to add request-level guards such as rate limiting, custom header validation, role gates, or multi-tenancy resolution to specific model actions.
---

# Add Middleware

Creates a middleware class and assigns it to a Lumina model's CRUD actions.

## Workflow

### Step 1: Ask Middleware Type

Ask the user what type of middleware they need:

> What type of middleware do you want to create?
>
> 1. **Rate limiting** -- Throttle requests per action (e.g., 10 creates/minute)
> 2. **Role gate** -- Require a specific role for certain actions
> 3. **Header validation** -- Require specific HTTP headers (e.g., API key)
> 4. **Custom logic** -- Describe your middleware requirements
> 5. **Multi-tenancy** -- Organization resolution from route or subdomain

Also ask:

> Should this middleware apply to:
> - **All actions** on the model (`$middleware` property)
> - **Specific actions** only (`$middlewareActions` property) -- which actions?
>   - `index`, `show`, `store`, `update`, `destroy`, `trashed`, `restore`, `forceDelete`

### Step 2: Generate Middleware Class

Create the middleware at `app/Http/Middleware/{MiddlewareName}.php`:

**Rate Limiting:**
```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Use Laravel's built-in throttle middleware via model properties:
// public static array $middlewareActions = [
//     'store' => ['throttle:10,1'],
//     'update' => ['throttle:30,1'],
// ];
// No custom class needed for simple rate limiting.
```

**Role Gate:**
```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $role  The required role slug
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = $request->user('sanctum');

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $organization = $request->get('organization');

        if (!$organization) {
            return response()->json(['message' => 'Organization context required'], 400);
        }

        $hasRole = $user->rolesInOrganization($organization)
            ->where('slug', $role)
            ->exists();

        if (!$hasRole) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
```

**Header Validation:**
```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidateCustomHeader
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $headerValue = $request->header('X-Custom-Header');

        if (!$headerValue) {
            return response()->json([
                'message' => 'Missing required header: X-Custom-Header',
            ], 400);
        }

        return $next($request);
    }
}
```

**Multi-Tenancy (Route-based):**

Lumina provides a built-in middleware at `Lumina\LaravelApi\Http\Middleware\ResolveOrganizationFromRoute`. You can also create a custom one:

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

        $user = $request->user('sanctum');
        if ($user) {
            $userBelongsToOrg = $user->organizations()
                ->where('organizations.id', $organization->id)
                ->exists();

            if (!$userBelongsToOrg) {
                return response()->json(['message' => 'Organization not found'], 404);
            }
        }

        $request->merge(['organization' => $organization]);
        $request->attributes->set('organization', $organization);

        return $next($request);
    }
}
```

### Step 3: Add to Model

Modify the model to reference the middleware:

**All actions:**
```php
class {ModelName} extends Model
{
    public static array $middleware = [
        \App\Http\Middleware\{MiddlewareName}::class,
    ];
}
```

**Specific actions:**
```php
class {ModelName} extends Model
{
    public static array $middlewareActions = [
        'store' => [\App\Http\Middleware\{MiddlewareName}::class],
        'update' => [\App\Http\Middleware\{MiddlewareName}::class],
        'destroy' => [\App\Http\Middleware\RequireRole::class . ':admin'],
    ];
}
```

**Using built-in Laravel middleware by alias:**

If using aliases, register in `bootstrap/app.php` (Laravel 12):

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'require-role' => \App\Http\Middleware\RequireRole::class,
    ]);
})
```

Then reference by alias on the model:

```php
public static array $middlewareActions = [
    'destroy' => ['require-role:admin'],
];
```

### Step 4: Verify Checklist

- [ ] Middleware class created at `app/Http/Middleware/{MiddlewareName}.php`
- [ ] Middleware follows standard `handle(Request $request, Closure $next): Response` signature
- [ ] Middleware returns `$next($request)` on success
- [ ] Middleware returns JSON error response on failure (with appropriate HTTP status code)
- [ ] Middleware does not contain business logic or data mutations
- [ ] Model updated with `$middleware` or `$middlewareActions` property
- [ ] If using alias, registered in `bootstrap/app.php`
- [ ] Action keys are valid: `index`, `show`, `store`, `update`, `destroy`, `trashed`, `restore`, `forceDelete`
