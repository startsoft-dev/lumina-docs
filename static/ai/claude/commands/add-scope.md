# /add-scope -- Create a Lumina Scope

You are creating a data-filtering scope for an existing Lumina model. This is the third layer of authorization -- it controls which records each user can see.

## Step 1: Identify the Model

Read the target model file. If the model name is not provided, ask for it. Understand its relationships and fields.

## Step 2: Ask Data Visibility Per Role

Ask the user: "What data should each role be able to see?"

Example scenarios to suggest:
- **Admin sees all, others see filtered:** "Admins see all records, editors see only active records, viewers see only published records"
- **User sees own records:** "Users only see records they created (where `user_id` matches)"
- **Organization-scoped + role filter:** "All users see records in their organization, but non-admins only see active ones"
- **No scope needed:** "All authenticated users see all records (filtering is handled by multi-tenancy alone)"

## Step 3: Generate the Scope

```php
// app/Models/Scopes/{ModelName}Scope.php
<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class {ModelName}Scope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        $user = auth('sanctum')->user();
        if (!$user) {
            return;
        }

        $organization = request()->get('organization');
        $roleSlug = $user->getRoleSlugForValidation($organization);

        // Role-based filtering
        switch ($roleSlug) {
            case 'admin':
                // Admins see all records -- no filter applied
                break;
            case 'editor':
                // Editors see only active records
                $builder->where('is_active', true);
                break;
            default:
                // Other roles see only published records
                $builder->where('status', 'published');
                break;
        }
    }
}
```

## Step 4: Register the Scope in the Model

Add to the model's `booted()` method:

```php
protected static function booted(): void
{
    static::addGlobalScope(new \App\Models\Scopes\{ModelName}Scope);
}
```

Alternatively, if the model uses the `HasAutoScope` trait, the scope is auto-discovered by convention (class name must be `{ModelName}Scope` in the `App\Models\Scopes` namespace).

## Common Scope Patterns

### Filter by authenticated user
```php
public function apply(Builder $builder, Model $model): void
{
    $user = auth('sanctum')->user();
    if ($user) {
        $builder->where('user_id', $user->id);
    }
}
```

### Role-based with organization context
```php
public function apply(Builder $builder, Model $model): void
{
    $user = auth('sanctum')->user();
    if (!$user) return;

    $organization = request()->get('organization');
    $roleSlug = $user->getRoleSlugForValidation($organization);

    if ($roleSlug !== 'admin') {
        $builder->where('is_active', true);
    }
}
```

### Token ability check (Sanctum)
```php
public function apply(Builder $builder, Model $model): void
{
    $user = auth('sanctum')->user();
    if ($user && $user->currentAccessToken()) {
        if (!$user->tokenCan('{model}:read-all')) {
            $builder->where('user_id', $user->id);
        }
    }
}
```

## Important Notes

- Scopes implement `Illuminate\Database\Eloquent\Scope` (not a Lumina-specific interface)
- Scopes filter data BEFORE the query runs -- they are applied as WHERE clauses
- Scopes are the data-filtering layer; policies are the action-authorization layer. Do not duplicate logic.
- For the User model scope, beware of infinite recursion -- see the `UserScope` pattern with `$applying` flag
- Scopes are applied to all queries for the model, including relationship queries
- Always use `auth('sanctum')->user()` to get the authenticated user
