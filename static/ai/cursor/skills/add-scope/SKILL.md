---
name: add-scope
description: Creates a Lumina scope for row-level data filtering on a model. Use this skill when a model needs different roles to see different subsets of records, such as viewers seeing only their own records while admins see all.
---

# Add Scope

Creates a scope that filters which records each role can see for a given Lumina model.

## Workflow

### Step 1: Identify Model

Locate the model file in `app/Models/`. Read the model to understand:
- The model class name
- Its fields (especially `user_id`, `organization_id`, `status`, or `is_published` fields that might be used for filtering)
- Whether it already has a scope or the `HasAutoScope` trait
- Its relationships (to understand indirect organization paths)

### Step 2: Read Roles

Open `app/Models/Role.php` and read the `$roles` static property.

### Step 3: Ask Data Visibility Per Role

For each role, ask the user:

> For the **{role}** role, which {ModelName} records should be visible?
>
> Options:
> - **All**: See all records in the organization (no filtering)
> - **Own only**: See only records where `user_id` matches the authenticated user
> - **Published only**: See only records where `is_published = true`
> - **Own + Published**: See own records (any status) plus all published records
> - **Custom**: Describe the filtering logic

### Step 4: Generate Scope

Create `app/Models/Scopes/{ModelName}Scope.php`:

```php
<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Scope for the {ModelName} model.
 *
 * Filters query results based on the authenticated user's role
 * within the current organization context.
 */
class {ModelName}Scope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     *
     * @param  \Illuminate\Database\Eloquent\Builder|\Illuminate\Database\Query\Builder  $builder
     * @param  \Illuminate\Database\Eloquent\Model  $model
     * @return void
     */
    public function apply($builder, $model): void
    {
        $user = auth('sanctum')->user();

        // Unauthenticated: return no results
        if (!$user) {
            $builder->whereRaw('1 = 0');
            return;
        }

        $organization = request()->get('organization');

        // No organization context: return no results
        if (!$organization) {
            $builder->whereRaw('1 = 0');
            return;
        }

        $roles = $user->rolesInOrganization($organization)->pluck('slug')->toArray();

        // Admin: see all records (no filtering)
        if (in_array('admin', $roles)) {
            return;
        }

        // Editor: see all records (adjust per requirements)
        if (in_array('editor', $roles)) {
            return;
        }

        // Viewer: see only own records
        if (in_array('viewer', $roles)) {
            $builder->where('user_id', $user->id);
            return;
        }

        // Unknown role: return no results
        $builder->whereRaw('1 = 0');
    }
}
```

### Step 5: Register Scope in Model

Choose one of two registration methods:

**Option A: `HasAutoScope` trait (recommended)**

The trait auto-discovers `app/Models/Scopes/{ModelName}Scope.php` by naming convention. Add to the model:

```php
use Lumina\LaravelApi\Traits\HasAutoScope;

class {ModelName} extends Model
{
    use HasFactory, SoftDeletes, HasValidation, HidableColumns, HasAutoScope;
}
```

**Option B: Manual registration in `booted()`**

Register the scope explicitly in the model's `booted()` method:

```php
use App\Models\Scopes\{ModelName}Scope;

class {ModelName} extends Model
{
    protected static function booted(): void
    {
        static::addGlobalScope(new {ModelName}Scope);
    }
}
```

### Step 6: Verify Checklist

- [ ] Scope file created at `app/Models/Scopes/{ModelName}Scope.php`
- [ ] Scope class implements `Illuminate\Database\Eloquent\Scope`
- [ ] `apply()` method has correct signature: `apply($builder, $model): void`
- [ ] Unauthenticated users handled: `auth('sanctum')->user()` returns null produces `whereRaw('1 = 0')`
- [ ] Missing organization context handled: `request()->get('organization')` null produces `whereRaw('1 = 0')`
- [ ] Role check uses `$user->rolesInOrganization($organization)->pluck('slug')->toArray()`
- [ ] Each role has explicit filtering logic matching the requirements from Step 3
- [ ] Unknown/unrecognized roles default to `whereRaw('1 = 0')` (deny by default)
- [ ] No exceptions are thrown from the scope
- [ ] Scope is registered in the model via `HasAutoScope` trait or `booted()` method
- [ ] Naming convention followed: `{ModelName}Scope.php` in `app/Models/Scopes/`
