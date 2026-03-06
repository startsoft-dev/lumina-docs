---
name: add-policy
description: Creates a Lumina policy for an existing model. Use this skill when a model needs a new policy or when an existing policy needs to be regenerated with updated role permissions and column visibility rules.
---

# Add Policy

Creates a policy for a Lumina model that controls CRUD authorization and column visibility per role.

## Workflow

### Step 1: Identify Model

Locate the model file in `app/Models/`. Read the model to understand:
- The model class name and namespace
- Its fields (`$fillable`)
- Its relationships
- Whether it uses `SoftDeletes` (if so, the policy should include soft delete methods)

### Step 2: Read Roles

Open `app/Models/Role.php` and read the `$roles` static property to discover all available roles in the application.

### Step 3: Ask CRUD Permissions Per Role

For each role, ask the user:

> For the **{role}** role, which actions should be allowed on {ModelName}?
> - [ ] `viewAny` (list all records)
> - [ ] `view` (view a single record)
> - [ ] `create` (create a new record)
> - [ ] `update` (edit an existing record)
> - [ ] `delete` (delete a record)
> - [ ] `viewTrashed` (list soft-deleted records) -- only if model uses SoftDeletes
> - [ ] `restore` (restore a soft-deleted record) -- only if model uses SoftDeletes
> - [ ] `forceDelete` (permanently delete) -- only if model uses SoftDeletes

### Step 4: Ask Hidden Columns Per Role

For each role, ask:

> For the **{role}** role, which columns should be hidden from the API response?
> Available columns: {list from $fillable and $allowedFields}

### Step 5: Generate Policy

Create `app/Policies/{ModelName}Policy.php`:

```php
<?php

namespace App\Policies;

use App\Models\User;
use App\Models\{ModelName};
use Lumina\LaravelApi\Policies\ResourcePolicy;

class {ModelName}Policy extends ResourcePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(?\Illuminate\Contracts\Auth\Authenticatable $user): bool
    {
        if (!$user) {
            return false;
        }

        $organization = request()->get('organization');
        $roles = $user->rolesInOrganization($organization)->pluck('slug')->toArray();

        return !empty(array_intersect($roles, [/* roles that can viewAny */]));
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(?\Illuminate\Contracts\Auth\Authenticatable $user, $model): bool
    {
        if (!$user) {
            return false;
        }

        $organization = request()->get('organization');
        $roles = $user->rolesInOrganization($organization)->pluck('slug')->toArray();

        return !empty(array_intersect($roles, [/* roles that can view */]));
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(?\Illuminate\Contracts\Auth\Authenticatable $user): bool
    {
        if (!$user) {
            return false;
        }

        $organization = request()->get('organization');
        $roles = $user->rolesInOrganization($organization)->pluck('slug')->toArray();

        return !empty(array_intersect($roles, [/* roles that can create */]));
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(?\Illuminate\Contracts\Auth\Authenticatable $user, $model): bool
    {
        if (!$user) {
            return false;
        }

        $organization = request()->get('organization');
        $roles = $user->rolesInOrganization($organization)->pluck('slug')->toArray();

        return !empty(array_intersect($roles, [/* roles that can update */]));
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(?\Illuminate\Contracts\Auth\Authenticatable $user, $model): bool
    {
        if (!$user) {
            return false;
        }

        $organization = request()->get('organization');
        $roles = $user->rolesInOrganization($organization)->pluck('slug')->toArray();

        return !empty(array_intersect($roles, [/* roles that can delete */]));
    }

    /**
     * Determine whether the user can view trashed models.
     * Only include if the model uses SoftDeletes.
     */
    public function viewTrashed(?\Illuminate\Contracts\Auth\Authenticatable $user): bool
    {
        if (!$user) {
            return false;
        }

        $organization = request()->get('organization');
        $roles = $user->rolesInOrganization($organization)->pluck('slug')->toArray();

        return !empty(array_intersect($roles, [/* roles that can viewTrashed */]));
    }

    /**
     * Determine whether the user can restore a soft-deleted model.
     * Only include if the model uses SoftDeletes.
     */
    public function restore(?\Illuminate\Contracts\Auth\Authenticatable $user, $model): bool
    {
        if (!$user) {
            return false;
        }

        $organization = request()->get('organization');
        $roles = $user->rolesInOrganization($organization)->pluck('slug')->toArray();

        return !empty(array_intersect($roles, [/* roles that can restore */]));
    }

    /**
     * Determine whether the user can permanently delete the model.
     * Only include if the model uses SoftDeletes.
     */
    public function forceDelete(?\Illuminate\Contracts\Auth\Authenticatable $user, $model): bool
    {
        if (!$user) {
            return false;
        }

        $organization = request()->get('organization');
        $roles = $user->rolesInOrganization($organization)->pluck('slug')->toArray();

        return in_array('admin', $roles);
    }

    /**
     * Define columns hidden from the API response based on the user's role.
     *
     * @return array<string>
     */
    public function hiddenColumns(?\Illuminate\Contracts\Auth\Authenticatable $user): array
    {
        if (!$user) {
            return [/* columns hidden from unauthenticated */];
        }

        $organization = request()->get('organization');
        $roles = $user->rolesInOrganization($organization)->pluck('slug')->toArray();

        if (in_array('admin', $roles)) {
            return []; // Admins see all columns
        }

        // Per-role column hiding based on Step 4 answers
        return [/* columns to hide */];
    }
}
```

### Step 6: Verify Checklist

- [ ] Policy file created at `app/Policies/{ModelName}Policy.php`
- [ ] Policy extends `Lumina\LaravelApi\Policies\ResourcePolicy`
- [ ] All 5 basic CRUD methods are implemented: `viewAny`, `view`, `create`, `update`, `delete`
- [ ] Soft delete methods included if model uses `SoftDeletes`: `viewTrashed`, `restore`, `forceDelete`
- [ ] `hiddenColumns()` method is implemented with role-based logic
- [ ] Every method handles `$user === null` by returning `false`
- [ ] Role checks use `$user->rolesInOrganization($organization)` -- NOT ownership checks
- [ ] No `$model->where(...)` or other queries inside the policy
- [ ] No organization membership checks (middleware handles this)
- [ ] Roles used match those defined in `Role::$roles`
