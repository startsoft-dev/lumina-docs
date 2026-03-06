# /add-model -- Interactive Lumina Model Creation

You are creating a new Lumina model. This is an interactive process -- ask the user questions before generating any code.

## Step 1: Gather Information

Ask the user for the following, one group at a time:

**Model basics:**
- Model name (e.g., `Post`, `Invoice`, `Task`)
- Table name (confirm or let them override the default plural snake_case)
- Fields with types (e.g., `title:string`, `amount:decimal`, `status:enum(draft,active,archived)`)

**Organization relationship:**
- Does this model have a direct `organization_id` column? (uses `BelongsToOrganization` trait)
- If not, Lumina auto-detects the path from BelongsTo relationships.
- Or is it not multi-tenant?

**Relationships:**
- Any `belongsTo`, `hasMany`, `hasOne`, `belongsToMany` relationships?
- Which relationships should be includable via the API? (for `$allowedIncludes`)

**Permissions per role:**
Ask: "What roles exist and what CRUD permissions should each have?"
Example format:
- admin: all (index, show, store, update, destroy, trashed, restore, forceDelete)
- editor: index, show, store, update
- viewer: index, show
- *: index, show

**Hidden columns per role:**
Ask: "Should any columns be hidden from certain roles?"

**Validation:**
Ask: "Should validation be role-based (different roles can edit different fields) or uniform?"
If role-based, ask which fields each role can set on store and update.

## Step 2: Generate Files

Generate the following files in order:

### 1. Migration

```php
// database/migrations/{timestamp}_create_{table}_table.php
Schema::create('{table}', function (Blueprint $table) {
    $table->id();
    // Add organization_id if direct tenant:
    // $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
    // User-specified fields here
    $table->timestamps();
    $table->softDeletes();
});
```

### 2. Model

```php
// app/Models/{ModelName}.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Lumina\LaravelApi\Traits\HasValidation;
use Lumina\LaravelApi\Traits\HidableColumns;
// Add BelongsToOrganization if direct tenant:
// use Lumina\LaravelApi\Traits\BelongsToOrganization;

class {ModelName} extends Model
{
    use HasFactory, SoftDeletes, HasValidation, HidableColumns;
    // Add BelongsToOrganization if direct tenant

    protected $fillable = [/* fields */];

    protected $validationRules = [/* field => rules */];

    // Simple format or role-based format
    protected $validationRulesStore = [/* fields or role => fields */];
    protected $validationRulesUpdate = [/* fields or role => fields */];

    protected static $allowedFilters = [/* filterable fields */];
    protected static $allowedSorts = [/* sortable fields */];
    protected static $defaultSort = '-created_at';
    protected static $allowedFields = [/* selectable fields, always include 'id' */];
    protected static $allowedIncludes = [/* relationship names */];
    protected static $allowedSearch = [/* searchable text fields */];

    // Relationships (indirect tenancy is auto-detected from BelongsTo relationships)
}
```

### 3. Policy

```php
// app/Policies/{ModelName}Policy.php
namespace App\Policies;

use Illuminate\Contracts\Auth\Authenticatable;
use Lumina\LaravelApi\Policies\ResourcePolicy;

class {ModelName}Policy extends ResourcePolicy
{
    // Override methods based on gathered permissions
    // Implement hiddenColumns() if role-based column hiding needed

    public function hiddenColumns(?Authenticatable $user): array
    {
        // Return columns to hide based on user role
        return [];
    }
}
```

### 4. Scope (if role-based data filtering needed)

```php
// app/Models/Scopes/{ModelName}Scope.php
namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class {ModelName}Scope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $user = auth('sanctum')->user();
        if (!$user) return;

        $organization = request()->get('organization');
        $roleSlug = $user->getRoleSlugForValidation($organization);

        // Role-based filtering logic
    }
}
```

If a scope is created, register it in the model:
```php
protected static function booted(): void
{
    static::addGlobalScope(new \App\Models\Scopes\{ModelName}Scope);
}
```

### 5. Config Registration

Add to `config/lumina.php` under the `models` key:
```php
'{slug}' => \App\Models\{ModelName}::class,
```

### 6. Factory

```php
// database/factories/{ModelName}Factory.php
namespace Database\Factories;

use App\Models\{ModelName};
use Illuminate\Database\Eloquent\Factories\Factory;

class {ModelName}Factory extends Factory
{
    protected $model = {ModelName}::class;

    public function definition(): array
    {
        return [
            // Faker data for each field
        ];
    }
}
```

## Step 3: Verification Checklist

After generating all files, verify and report:

| Check | Status |
|-------|--------|
| Model has `HasFactory` trait | |
| Model has `SoftDeletes` trait | |
| Model has `HasValidation` trait | |
| Model has `HidableColumns` trait | |
| Model has `BelongsToOrganization` (if direct) or auto-detected indirect path (if multi-tenant) | |
| `$fillable` defined | |
| `$validationRules` defined | |
| `$validationRulesStore` defined | |
| `$validationRulesUpdate` defined | |
| `$allowedFilters` defined | |
| `$allowedSorts` defined | |
| `$defaultSort` defined | |
| `$allowedFields` defined (includes 'id') | |
| `$allowedIncludes` defined | |
| `$allowedSearch` defined | |
| Policy created extending ResourcePolicy | |
| Policy registered (Laravel auto-discovery or AuthServiceProvider) | |
| Scope created (if needed) and registered in model | |
| Model registered in `config/lumina.php` | |
| Factory created | |
| Migration created | |
