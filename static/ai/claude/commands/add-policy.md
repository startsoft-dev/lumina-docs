# /add-policy -- Create a Lumina Policy

You are creating a policy for an existing Lumina model. This is interactive -- gather requirements before generating.

## Step 1: Identify the Model

Read the target model file to understand its fields, relationships, and current configuration. If the model name is not provided, ask for it.

## Step 2: Ask CRUD Permissions Per Role

Ask the user: "What CRUD permissions should each role have?"

Present the available actions:
- `viewAny` (index) -- list all records
- `view` (show) -- view a single record
- `create` (store) -- create a new record
- `update` -- update an existing record
- `delete` (destroy) -- soft delete a record
- `viewTrashed` -- view trashed records
- `restore` -- restore a trashed record
- `forceDelete` -- permanently delete a record

Example format to suggest:
```
admin: all
editor: viewAny, view, create, update
viewer: viewAny, view
*: viewAny, view
```

If all roles have the same permissions (e.g., all have full access), the policy can rely on the base `ResourcePolicy` permission engine and no method overrides are needed.

If custom logic is needed (e.g., "users can only delete their own records"), ask for specifics.

## Step 3: Ask Hidden Columns Per Role

Ask: "Should any columns be hidden from certain roles in API responses?"

Example:
```
admin: no hidden columns
editor: hide 'internal_notes', 'cost'
viewer: hide 'internal_notes', 'cost', 'email'
*: hide 'internal_notes', 'cost', 'email'
```

## Step 4: Generate the Policy

```php
// app/Policies/{ModelName}Policy.php
<?php

namespace App\Policies;

use Illuminate\Contracts\Auth\Authenticatable;
use Lumina\LaravelApi\Policies\ResourcePolicy;

class {ModelName}Policy extends ResourcePolicy
{
    /**
     * Override methods only where custom logic is needed.
     * The base ResourcePolicy checks permissions via {slug}.{action} format.
     * Only override if you need additional conditions beyond permission checks.
     */

    // Example: custom delete logic
    // public function delete(?Authenticatable $user, $model): bool
    // {
    //     if (!parent::delete($user, $model)) {
    //         return false;
    //     }
    //     // Additional custom condition
    //     return $user->id === $model->author_id;
    // }

    /**
     * Hide columns based on the authenticated user's role.
     *
     * These are additive -- merged with base hidden columns
     * (password, remember_token, timestamps, etc.).
     */
    public function hiddenColumns(?Authenticatable $user): array
    {
        if (!$user) {
            return [/* columns to hide from unauthenticated users */];
        }

        $organization = request()->get('organization');
        $isAdmin = $user->userRoles()
            ->where('organization_id', $organization?->id)
            ->whereHas('role', fn ($q) => $q->where('slug', 'admin'))
            ->exists();

        if ($isAdmin) {
            return [];
        }

        // Non-admin users: hide sensitive columns
        return [/* columns to hide */];
    }
}
```

## Role Checking Patterns

Use these patterns for role-based logic inside policy methods:

```php
// Check if user is admin in current organization
$organization = request()->get('organization');
$isAdmin = $user->userRoles()
    ->where('organization_id', $organization?->id)
    ->whereHas('role', fn ($q) => $q->where('slug', 'admin'))
    ->exists();

// Get user's role slug
$roleSlug = $user->getRoleSlugForValidation($organization);

// Check specific role
if ($roleSlug === 'editor') { ... }
```

## Important Notes

- Always extend `Lumina\LaravelApi\Policies\ResourcePolicy`
- The base class handles permission checking via `{slug}.{action}` format automatically
- Only override methods when you need logic beyond permission checks
- `hiddenColumns()` returns column names to HIDE, not to show
- Hidden columns are additive with base hidden columns (password, remember_token, timestamps)
- Laravel auto-discovers policies by convention (`App\Policies\{ModelName}Policy` for `App\Models\{ModelName}`)
