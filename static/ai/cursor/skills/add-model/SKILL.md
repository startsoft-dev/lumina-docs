---
name: add-model
description: Scaffolds a complete Lumina model with migration, traits, validation rules, policy, scope, config registration, and factory. Use this skill when you need to add a new API resource to a Lumina application.
---

# Add Model

Creates a fully configured Lumina model with all required layers for the automatic REST API.

## Workflow

### Step 1: Gather Requirements

Read the existing role definitions first, then ask the user for model details.

**Read existing roles:**
Open `app/Models/Role.php` and read the `$roles` static property to discover all available roles.

**Ask the user:**

1. What is the model name? (PascalCase, singular, e.g., `Project`)
2. What are the fields?
   - For each field: name, type (string, integer, boolean, text, decimal, date, datetime, json), nullable?, default value?
3. Does this model belong to an organization?
   - **Directly**: Has an `organization_id` column (use `BelongsToOrganization` trait)
   - **Indirectly**: Through another model (auto-detected from BelongsTo relationships)
4. What are the relationships? (belongsTo, hasMany, belongsToMany with pivot details)

### Step 2: Ask Permissions Per Role (MANDATORY)

This step is **mandatory** and must not be skipped. For every role found in `Role::$roles`, ask:

1. **CRUD permissions**: Which actions can this role perform?
   - `index` (list all)
   - `show` (view single)
   - `store` (create)
   - `update` (edit)
   - `destroy` (delete)

2. **Hidden columns**: Which columns should be hidden from this role's API response?

3. **Record visibility**: Which records should this role see?
   - All records in the organization
   - Only records they created (`user_id = auth user`)
   - A filtered subset (e.g., only published records)
   - Custom logic

### Step 3: Generate Migration

Create `database/migrations/{timestamp}_create_{table_name}_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('{table_name}', function (Blueprint $table) {
            $table->id();
            // If direct org relationship:
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            // Add user fields as needed
            // $table->string('title');
            // $table->text('body')->nullable();
            // $table->boolean('is_published')->default(false);
            // $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('{table_name}');
    }
};
```

### Step 4: Generate Model

Create `app/Models/{ModelName}.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Lumina\LaravelApi\Traits\HasValidation;
use Lumina\LaravelApi\Traits\HidableColumns;
// Use one of these for organization scoping:
// use Lumina\LaravelApi\Traits\BelongsToOrganization;  // direct org_id
// use Lumina\LaravelApi\Traits\HasAutoScope;            // if custom scope needed

class {ModelName} extends Model
{
    use HasFactory, SoftDeletes, HasValidation, HidableColumns;
    // use BelongsToOrganization;  // if direct organization_id
    // use HasAutoScope;            // if custom scope needed

    protected $fillable = [
        // List all mass-assignable fields
    ];

    // ---------------------------------------------------------------
    // Validation rules
    // ---------------------------------------------------------------

    protected $validationRules = [
        // 'title' => 'required|string|max:255',
        // 'body' => 'required|string',
    ];

    protected $validationRulesStore = [
        // Fields required on create (field names only)
    ];

    protected $validationRulesUpdate = [
        // Fields required on update (field names only)
    ];

    // ---------------------------------------------------------------
    // Query Builder configuration
    // ---------------------------------------------------------------

    public static $allowedFilters = [];
    public static $allowedSorts = [];
    public static $defaultSort = '-created_at';
    public static $allowedFields = [];
    public static $allowedIncludes = [];
    // public static $allowedSearch = [];

    // ---------------------------------------------------------------
    // Relationships (organization scoping is auto-detected from BelongsTo)
    // ---------------------------------------------------------------

    // public function organization()
    // {
    //     return $this->belongsTo(Organization::class);
    // }
}
```

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
    public function viewAny(?\Illuminate\Contracts\Auth\Authenticatable $user): bool
    {
        if (!$user) {
            return false;
        }

        $organization = request()->get('organization');
        $roles = $user->rolesInOrganization($organization)->pluck('slug')->toArray();

        // Adjust per role requirements gathered in Step 2
        return !empty(array_intersect($roles, ['admin', 'editor', 'viewer']));
    }

    public function view(?\Illuminate\Contracts\Auth\Authenticatable $user, $model): bool
    {
        if (!$user) {
            return false;
        }

        $organization = request()->get('organization');
        $roles = $user->rolesInOrganization($organization)->pluck('slug')->toArray();

        return !empty(array_intersect($roles, ['admin', 'editor', 'viewer']));
    }

    public function create(?\Illuminate\Contracts\Auth\Authenticatable $user): bool
    {
        if (!$user) {
            return false;
        }

        $organization = request()->get('organization');
        $roles = $user->rolesInOrganization($organization)->pluck('slug')->toArray();

        return !empty(array_intersect($roles, ['admin', 'editor']));
    }

    public function update(?\Illuminate\Contracts\Auth\Authenticatable $user, $model): bool
    {
        if (!$user) {
            return false;
        }

        $organization = request()->get('organization');
        $roles = $user->rolesInOrganization($organization)->pluck('slug')->toArray();

        return !empty(array_intersect($roles, ['admin', 'editor']));
    }

    public function delete(?\Illuminate\Contracts\Auth\Authenticatable $user, $model): bool
    {
        if (!$user) {
            return false;
        }

        $organization = request()->get('organization');
        $roles = $user->rolesInOrganization($organization)->pluck('slug')->toArray();

        return in_array('admin', $roles);
    }

    public function hiddenColumns(?\Illuminate\Contracts\Auth\Authenticatable $user): array
    {
        if (!$user) {
            return [];
        }

        $organization = request()->get('organization');
        $roles = $user->rolesInOrganization($organization)->pluck('slug')->toArray();

        if (in_array('admin', $roles)) {
            return [];
        }

        // Adjust per hidden column requirements gathered in Step 2
        return [];
    }
}
```

### Step 6: Generate Scope (if needed)

If Step 2 revealed that different roles see different records, create `app/Models/Scopes/{ModelName}Scope.php`:

```php
<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class {ModelName}Scope implements Scope
{
    public function apply($builder, $model): void
    {
        $user = auth('sanctum')->user();

        if (!$user) {
            $builder->whereRaw('1 = 0');
            return;
        }

        $organization = request()->get('organization');
        if (!$organization) {
            $builder->whereRaw('1 = 0');
            return;
        }

        $roles = $user->rolesInOrganization($organization)->pluck('slug')->toArray();

        if (in_array('admin', $roles)) {
            return;
        }

        // Adjust filtering per role requirements gathered in Step 2
        $builder->where('user_id', $user->id);
    }
}
```

Then add `use Lumina\LaravelApi\Traits\HasAutoScope;` to the model.

### Step 7: Register in Config

Add the model to `config/lumina.php` in the `'models'` array:

```php
'models' => [
    // ... existing models ...
    '{slug}' => \App\Models\{ModelName}::class,
],
```

The slug should be the snake_case plural form of the model name (e.g., `blog_posts` for `BlogPost`).

### Step 8: Generate Factory

Create `database/factories/{ModelName}Factory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\{ModelName};
use Illuminate\Database\Eloquent\Factories\Factory;

class {ModelName}Factory extends Factory
{
    protected $model = {ModelName}::class;

    public function definition(): array
    {
        return [
            // Generate realistic fake data for each field
            // 'title' => fake()->sentence(),
            // 'body' => fake()->paragraphs(3, true),
            // 'is_published' => fake()->boolean(),
            // 'organization_id' => \App\Models\Organization::factory(),
            // 'user_id' => \App\Models\User::factory(),
        ];
    }
}
```

### Step 9: Verify Checklist

- [ ] Migration creates all columns with correct types, constraints, and foreign keys
- [ ] Model has traits: `HasFactory`, `SoftDeletes`, `HasValidation`, `HidableColumns`
- [ ] Model has `BelongsToOrganization` trait (if direct `organization_id`) OR auto-detected BelongsTo chain (indirect)
- [ ] Model has `$fillable` with all mass-assignable fields
- [ ] Model has `$validationRules` with rules for all fields
- [ ] Model has `$validationRulesStore` with fields required on create
- [ ] Model has `$validationRulesUpdate` with fields required on update
- [ ] Model has `$allowedFilters`, `$allowedSorts`, `$defaultSort`, `$allowedFields`, `$allowedIncludes`
- [ ] Policy extends `Lumina\LaravelApi\Policies\ResourcePolicy`
- [ ] Policy has all 5 CRUD methods with correct role-based logic
- [ ] Policy has `hiddenColumns()` method
- [ ] Policy has NO ownership checks and NO model queries
- [ ] Scope exists and handles unauthenticated users (if row-level filtering needed)
- [ ] Scope registered via `HasAutoScope` trait or `booted()`
- [ ] Model registered in `config/lumina.php` with correct slug
- [ ] Factory generates valid data for all required fields
