---
name: override-action
description: Overrides a specific CRUD action on a Lumina model with a custom controller route. Use this skill when the default GlobalController behavior for a particular action (index, show, store, update, destroy) needs custom logic.
---

# Override Action

Replaces a Lumina auto-generated CRUD action with a custom controller route while keeping the rest of the auto-generated endpoints intact.

## Workflow

### Step 1: Ask Which Action to Override

Ask the user:

> Which CRUD action do you want to override on **{ModelName}**?
>
> - `index` -- Custom list logic (GET `/{slug}`)
> - `show` -- Custom detail logic (GET `/{slug}/{id}`)
> - `store` -- Custom create logic (POST `/{slug}`)
> - `update` -- Custom update logic (PUT `/{slug}/{id}`)
> - `destroy` -- Custom delete logic (DELETE `/{slug}/{id}`)
> - `trashed` -- Custom trashed list logic (GET `/{slug}/trashed`)
> - `restore` -- Custom restore logic (POST `/{slug}/{id}/restore`)
> - `forceDelete` -- Custom force delete logic (DELETE `/{slug}/{id}/force-delete`)
>
> Why are you overriding this action? What custom behavior is needed?

### Step 2: Add to `$exceptActions`

Add the overridden action to the model's `$exceptActions` so Lumina does not generate the default route:

```php
class {ModelName} extends Model
{
    // Exclude the overridden action from auto-generated routes
    public static array $exceptActions = ['{action}'];
}
```

This prevents the Lumina route registration from creating the default route for this action. The remaining CRUD actions continue to work automatically.

### Step 3: Generate Custom Controller Action

Create a controller (or add a method to an existing controller) at `app/Http/Controllers/{ModelName}Controller.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\{ModelName};
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class {ModelName}Controller extends Controller
{
    /**
     * Custom {action} action for {ModelName}.
     */
    public function {action}(Request $request{, int $id}): JsonResponse
    {
        // Get organization context (if multi-tenant)
        $organization = $request->get('organization');

        // Your custom logic here
        // ...

        return response()->json([
            'data' => $result,
        ]);
    }
}
```

**Example: Custom store with side effects:**
```php
public function store(Request $request): JsonResponse
{
    $organization = $request->get('organization');

    $validated = $request->validate([
        'title' => 'required|string|max:255',
        'body' => 'required|string',
    ]);

    $model = {ModelName}::create([
        ...$validated,
        'organization_id' => $organization->id,
        'user_id' => $request->user()->id,
    ]);

    // Custom side effect: send notification, dispatch job, etc.
    // Notification::send($admins, new New{ModelName}Notification($model));

    return response()->json([
        'data' => $model,
    ], 201);
}
```

**Example: Custom index with aggregation:**
```php
public function index(Request $request): JsonResponse
{
    $organization = $request->get('organization');

    $models = {ModelName}::query()
        ->where('organization_id', $organization->id)
        ->withCount('comments')
        ->withAvg('ratings', 'score')
        ->paginate($request->input('per_page', 25));

    return response()->json($models);
}
```

### Step 4: Define Route ABOVE the Lumina require Line

The custom route MUST be defined ABOVE the auto-generated routes in `routes/api.php`. The first registered route wins in Laravel, so defining it above ensures the custom route takes priority.

Locate the section in `routes/api.php` where the auto-generated CRUD routes are registered (the `foreach ($models as $slug => $modelClass)` block). Add your custom route ABOVE it:

```php
/*
|--------------------------------------------------------------------------
| Custom Route Overrides
|--------------------------------------------------------------------------
| Define custom routes ABOVE the auto-generated section.
| The first registered route wins.
|--------------------------------------------------------------------------
*/

// Multi-tenant route prefix (if enabled)
$globalControllerConfig = config('lumina', []);
$multiTenant = $globalControllerConfig['multi_tenant'] ?? [];
$isMultiTenant = $multiTenant['enabled'] ?? false;
$useSubdomain = $multiTenant['use_subdomain'] ?? false;
$needsOrgPrefix = $isMultiTenant && !$useSubdomain;
$multiTenantMiddleware = !empty($multiTenant['middleware']) ? $multiTenant['middleware'] : null;

// Custom override: {ModelName} {action}
$prefix = $needsOrgPrefix ? '{organization}/{slug}' : '{slug}';
$middleware = array_filter(['auth:sanctum', $multiTenantMiddleware]);

Route::prefix($prefix)
    ->middleware($middleware)
    ->group(function () {
        // Override: custom {action}
        // Match the HTTP method and URI pattern of the action being overridden:
        // Route::get('/', [{ModelName}Controller::class, 'index']);        // index
        // Route::get('{id}', [{ModelName}Controller::class, 'show']);      // show
        // Route::post('/', [{ModelName}Controller::class, 'store']);       // store
        // Route::put('{id}', [{ModelName}Controller::class, 'update']);    // update
        // Route::delete('{id}', [{ModelName}Controller::class, 'destroy']); // destroy
    });

/*
|--------------------------------------------------------------------------
| Auto-Generated CRUD Routes (below this line)
|--------------------------------------------------------------------------
*/
// ... existing foreach loop ...
```

### Step 5: Verify Checklist

- [ ] Action added to model's `$exceptActions` array
- [ ] Custom controller created at `app/Http/Controllers/{ModelName}Controller.php`
- [ ] Controller method matches the action signature (correct HTTP method, parameters)
- [ ] Custom route defined in `routes/api.php` ABOVE the auto-generated route section
- [ ] Route uses the same prefix pattern as auto-generated routes (respects multi-tenant `{organization}` prefix)
- [ ] Route has the same middleware as auto-generated routes (`auth:sanctum`, multi-tenant middleware)
- [ ] Custom logic does not break the API contract (returns JSON in the expected format)
- [ ] Other CRUD actions for this model continue to work via Lumina's GlobalController
- [ ] Route name follows the convention `{slug}.{action}` (e.g., `posts.store`)
