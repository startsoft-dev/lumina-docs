# /add-middleware -- Create and Attach Middleware to a Lumina Model

You are creating a middleware class and attaching it to a Lumina model. Lumina models define their middleware directly on the model, not in route files or controllers.

## Step 1: Gather Information

Ask the user:

1. **Model name:** Which model should this middleware apply to?
2. **Middleware purpose:** What should the middleware do? Examples:
   - Log access to the resource
   - Add custom response headers
   - Rate limit specific actions
   - Check a custom condition before processing
   - Transform request data
3. **Scope:** Should the middleware apply to:
   - All CRUD actions (`$middleware`)
   - Specific actions only (`$middlewareActions`) -- e.g., only `store` and `update`

## Step 2: Generate the Middleware Class

```php
// app/Http/Middleware/{MiddlewareName}.php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class {MiddlewareName}
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Before logic (runs before the controller action)

        $response = $next($request);

        // After logic (runs after the controller action)

        return $response;
    }
}
```

## Step 3: Attach to the Model

Lumina models declare middleware as static properties on the model class.

### Apply to all actions

```php
// In the model class
public static array $middleware = [
    \App\Http\Middleware\{MiddlewareName}::class,
];
```

### Apply to specific actions only

```php
// In the model class
public static array $middlewareActions = [
    'store' => [\App\Http\Middleware\{MiddlewareName}::class],
    'update' => [\App\Http\Middleware\{MiddlewareName}::class],
];
```

Available action keys: `index`, `show`, `store`, `update`, `destroy`, `trashed`, `restore`, `forceDelete`.

### Exclude specific actions

```php
// In the model class -- exclude these actions from being routed
protected $exceptActions = ['destroy'];
```

## Common Middleware Patterns

### Logging middleware
```php
class LogModelAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        Log::info('Model accessed', [
            'model' => $request->route('model'),
            'action' => $request->method(),
            'user_id' => $request->user()?->id,
            'ip' => $request->ip(),
        ]);

        return $response;
    }
}
```

### Custom header middleware
```php
class AddCustomHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Custom-Header', 'value');

        return $response;
    }
}
```

### Condition check middleware
```php
class EnsureModelIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        // Check a condition before proceeding
        if (!config('features.model_enabled')) {
            abort(403, 'This feature is currently disabled.');
        }

        return $next($request);
    }
}
```

## Important Notes

- Middleware in Lumina is declared on the model, not in route files or `bootstrap/app.php`
- Use `public static array $middleware` for all-action middleware
- Use `public static array $middlewareActions` for action-specific middleware
- Use `protected $exceptActions` to exclude actions from being routed entirely
- The middleware receives the standard Laravel `Request` object with organization context available via `$request->get('organization')`
- You can combine `$middleware` and `$middlewareActions` on the same model
