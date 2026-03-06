# Lumina Laravel Server — Models (Skill)

You are a senior software engineer specialized in **Lumina**, a Laravel package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **Laravel (PHP)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina model configuration: the `LuminaModel` base class, all available traits (`HasValidation`, `HasPermissions`, `HasAuditTrail`, `HasUuid`, `BelongsToOrganization`, `HidableColumns`, `HasAutoScope`, `ViewModelHelpers`), all model static properties, and how to build a complete model.

---

## Documentation

### LuminaModel Base Class

Extend `LuminaModel` to get all core traits automatically:

```php
use Lumina\LaravelApi\Models\LuminaModel;

class Post extends LuminaModel
{
    protected $fillable = ['title', 'content', 'status'];

    public static $allowedFilters  = ['status', 'user_id'];
    public static $allowedSorts    = ['created_at', 'title'];
    public static $allowedSearch   = ['title', 'content'];
}
```

`LuminaModel` includes these traits automatically:

| Trait | Purpose |
|---|---|
| `HasFactory` | Laravel factory support for testing |
| `SoftDeletes` | Trash, restore, and force-delete endpoints |
| `HasValidation` | Role-based validation rules |
| `HidableColumns` | Dynamic column hiding from API responses |
| `HasAutoScope` | Auto-discovery of scope classes |

### Optional Traits

Add these manually when needed:

```php
use Lumina\LaravelApi\Traits\HasAuditTrail;
use Lumina\LaravelApi\Traits\BelongsToOrganization;

class Post extends LuminaModel
{
    use HasAuditTrail, BelongsToOrganization;
}
```

| Trait | Purpose |
|---|---|
| `HasAuditTrail` | Automatic change logging to `audit_logs` table |
| `HasUuid` | Auto-generated UUID on creation |
| `BelongsToOrganization` | Multi-tenant organization scoping |
| `HasPermissions` | Permission checking (User model only) |

### Model Configuration Properties

| Property | Type | Description |
|---|---|---|
| `$fillable` | `array` | Mass-assignable fields for POST/PUT requests |
| `$allowedFilters` | `array` | Fields for `?filter[field]=value` |
| `$allowedSorts` | `array` | Fields for `?sort=field` (prefix `-` for descending) |
| `$defaultSort` | `string` | Sort when no `?sort` given (e.g. `'-created_at'`) |
| `$allowedFields` | `array` | Fields for sparse fieldsets `?fields[model]=f1,f2` |
| `$allowedIncludes` | `array` | Relationships for `?include=relation` |
| `$allowedSearch` | `array` | Fields searched with `?search=term` |
| `$paginationEnabled` | `bool` | Enable/disable pagination (default `true`) |
| `$perPage` | `int` | Records per page |
| `$middleware` | `array` | Middleware for all routes |
| `$middlewareActions` | `array` | Middleware for specific actions |
| `$exceptActions` | `array` | CRUD actions to exclude from route generation |

### HasValidation

Adds `$validationRules` and `$validationRulesMessages` to your model:

```php
class Post extends LuminaModel
{
    protected $validationRules = [
        'title'   => 'string|max:255',
        'content' => 'string',
        'status'  => 'string|in:draft,published,archived',
    ];

    protected $validationRulesMessages = [
        'title.max' => 'Post title cannot exceed 255 characters.',
    ];
}
```

### HasPermissions (User model)

Adds permission checking:

```php
use Lumina\LaravelApi\Traits\HasPermissions;

class User extends LuminaModel
{
    use HasPermissions;
}

$user->hasPermission('posts.store', $organization); // true/false
$user->hasPermission('*', $organization);           // superadmin check
$user->hasPermission('posts.*', $organization);     // all post actions
```

### HasAuditTrail

Auto-logs changes: `created`, `updated`, `deleted`, `force_deleted`, `restored`.

```php
class User extends LuminaModel
{
    use HasAuditTrail;

    protected $auditExclude = ['password', 'remember_token', 'api_token'];
}

$post->auditLogs()->latest()->get();
```

### HasUuid

Auto-generates UUID on creation. Requires `uuid` column in migration:

```php
$table->uuid('uuid')->unique()->nullable();
```

### BelongsToOrganization

Multi-tenant scoping. Auto-filters queries and sets `organization_id` on create. For indirect models, Lumina auto-detects the ownership path from BelongsTo relationships.

```php
class Comment extends LuminaModel
{
    use BelongsToOrganization;
    // ownership path auto-detected: Comment → post → blog → organization
}
```

Lumina walks the `belongsTo` chain automatically to find the organization.

### HidableColumns

Controls column visibility in API responses:
1. **Base hidden**: `password`, `remember_token`, `created_at`, `updated_at`, `deleted_at`, `email_verified_at`
2. **Model-level**: via `$additionalHiddenColumns`
3. **Policy-level**: via `permittedAttributesForShow()` / `hiddenAttributesForShow()`

```php
class User extends LuminaModel
{
    public static $additionalHiddenColumns = ['api_token', 'stripe_id'];
}
```

### HasAutoScope

Auto-applies `App\Models\Scopes\{ModelName}Scope` if it exists:

```php
// app/Models/Scopes/PostScope.php
class PostScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $builder->where('is_visible', true);
    }
}
```

### ViewModelHelpers

Currency formatting utility:

```php
use Lumina\LaravelApi\Traits\ViewModelHelpers;
use Lumina\LaravelApi\Enums\CurrencyOption;

class Product extends LuminaModel
{
    use ViewModelHelpers;
}

$product->formatPrice(1234.56, CurrencyOption::USD); // "$1,234.56"
$product->formatPrice(1234.56, CurrencyOption::BRL); // "R$1.234,56"
```

---

## Frequently Asked Questions

**Q: What's the difference between `LuminaModel` and using traits manually?**

A: `LuminaModel` is a convenience base class that pre-includes `HasFactory`, `SoftDeletes`, `HasValidation`, `HidableColumns`, and `HasAutoScope`. You can extend plain `Illuminate\Database\Eloquent\Model` and add traits yourself if you want full control — `LuminaModel` is not a requirement.

**Q: How do I exclude a CRUD action from being generated?**

A: Use `$exceptActions`:

```php
class Post extends LuminaModel
{
    public static array $exceptActions = ['destroy']; // No DELETE endpoint
}
```

Valid values: `'index'`, `'show'`, `'store'`, `'update'`, `'destroy'`.

**Q: How do I customize the base LuminaModel for all my models?**

A: Publish it:

```bash
php artisan vendor:publish --tag=lumina-model
```

This creates `app/Models/LuminaModel.php` that you can customize:

```php
use Lumina\LaravelApi\Models\LuminaModel as BaseLuminaModel;

class LuminaModel extends BaseLuminaModel
{
    use HasAuditTrail; // Now all models get audit trail
}
```

**Q: How do I add middleware to specific actions only?**

A: Use `$middlewareActions`:

```php
public static array $middlewareActions = [
    'store'   => ['verified'],
    'destroy' => ['admin'],
];
```

**Q: How does indirect ownership work for nested models?**

A: Lumina auto-detects the path by introspecting BelongsTo relationships. For example, if `Comment` belongs to `Post` which belongs to `Blog` (which has `organization_id`), Lumina automatically traverses `Comment -> post -> blog` to find the organization. No configuration needed.

---

## Real-World Examples

### Complete Blog Post Model

```php
<?php

namespace App\Models;

use Lumina\LaravelApi\Models\LuminaModel;
use Lumina\LaravelApi\Traits\HasAuditTrail;
use Lumina\LaravelApi\Traits\HasUuid;
use Lumina\LaravelApi\Traits\BelongsToOrganization;

class BlogPost extends LuminaModel
{
    use HasAuditTrail, HasUuid, BelongsToOrganization;

    protected $fillable = [
        'title', 'slug', 'content', 'excerpt',
        'status', 'featured_image', 'user_id',
        'category_id', 'published_at',
    ];

    protected $casts = [
        'published_at' => 'datetime',
    ];

    protected $validationRules = [
        'title'   => 'string|max:255',
        'slug'    => 'string|max:255',
        'content' => 'string',
        'excerpt' => 'string|max:500',
        'status'  => 'string|in:draft,published,archived',
    ];

    public static $allowedFilters  = ['status', 'user_id', 'category_id'];
    public static $allowedSorts    = ['created_at', 'title', 'published_at'];
    public static $defaultSort     = '-published_at';
    public static $allowedIncludes = ['user', 'category', 'comments', 'tags'];
    public static $allowedSearch   = ['title', 'content', 'excerpt'];
    public static $allowedFields   = ['id', 'title', 'slug', 'excerpt', 'status', 'published_at'];

    protected $perPage = 20;

    public function user()     { return $this->belongsTo(User::class); }
    public function category() { return $this->belongsTo(Category::class); }
    public function comments() { return $this->hasMany(Comment::class); }
    public function tags()     { return $this->belongsToMany(Tag::class); }
}
```

### E-Commerce Product Model

```php
class Product extends LuminaModel
{
    use HasAuditTrail, BelongsToOrganization, ViewModelHelpers;

    protected $fillable = ['name', 'sku', 'price', 'stock', 'category_id'];

    protected $validationRules = [
        'name'  => 'string|max:255',
        'sku'   => 'string|max:50',
        'price' => 'numeric|min:0',
        'stock' => 'integer|min:0',
    ];

    public static $allowedFilters  = ['category_id', 'stock'];
    public static $allowedSorts    = ['price', 'name', 'created_at'];
    public static $allowedSearch   = ['name', 'sku'];
    public static $allowedIncludes = ['category', 'reviews'];

    public static $additionalHiddenColumns = ['cost_price', 'supplier_id'];
}
```
