---
sidebar_position: 2
title: Models
---

# Models

Lumina models are standard Laravel Eloquent models enhanced with declarative static properties and traits that control how REST API endpoints are generated and behave. By configuring these properties directly on your model, Lumina automatically builds fully-featured API endpoints with filtering, sorting, searching, pagination, validation, and authorization -- all without writing controllers or routes.

## Model Configuration Properties

Below is a complete model example demonstrating **all** available static properties that Lumina recognizes:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Lumina\LaravelApi\Traits\HasValidation;
use Lumina\LaravelApi\Traits\HasAuditTrail;
use Lumina\LaravelApi\Traits\BelongsToOrganization;

class Post extends Model
{
    use SoftDeletes, HasValidation, HasAuditTrail, BelongsToOrganization;

    protected $fillable = [
        'title', 'content', 'status', 'user_id', 'category_id',
    ];

    // ── Query Builder ────────────────────────────────────────────
    public static $allowedFilters  = ['status', 'user_id', 'category_id'];
    public static $allowedSorts    = ['created_at', 'title', 'updated_at'];
    public static $defaultSort     = '-created_at';
    public static $allowedFields   = ['id', 'title', 'content', 'status'];
    public static $allowedIncludes = ['user', 'comments', 'tags'];
    public static $allowedSearch   = ['title', 'content'];

    // ── Pagination ───────────────────────────────────────────────
    public static bool $paginationEnabled = true;
    protected $perPage = 25;

    // ── Middleware ────────────────────────────────────────────────
    public static array $middleware = ['throttle:60,1'];
    public static array $middlewareActions = [
        'store'   => ['verified'],
        'destroy' => ['admin'],
    ];

    // ── Route Exclusion ──────────────────────────────────────────
    public static array $exceptActions = ['destroy']; // skip DELETE endpoint

    // ── Organization Path (for nested models) ────────────────────
    public static string $owner = 'blog'; // Post -> blog -> organization
}
```

### Property Reference

| Property | Type | Description |
|---|---|---|
| `$fillable` | `array` | Standard Eloquent mass-assignable fields. Lumina uses this to determine which fields can be set via `POST` and `PUT`/`PATCH` requests. |
| `$allowedFilters` | `array` | Fields available for query-string filtering via `?filter[field]=value`. Only the fields listed here can be filtered on. |
| `$allowedSorts` | `array` | Fields available for sorting via `?sort=field`. Prefix with `-` for descending order (e.g., `?sort=-created_at`). |
| `$defaultSort` | `string` | The sort applied when no `?sort` parameter is provided. Use the `-` prefix for descending (e.g., `'-created_at'`). |
| `$allowedFields` | `array` | Fields that can be selected via sparse fieldsets (`?fields[model]=field1,field2`). Limits which columns are returned. |
| `$allowedIncludes` | `array` | Relationships that can be eager-loaded via `?include=relation`. Must correspond to defined Eloquent relationships on the model. |
| `$allowedSearch` | `array` | Fields searched when `?search=term` is used. Lumina performs a case-insensitive `LIKE` search across all listed fields. |
| `$paginationEnabled` | `bool` | Enables or disables pagination for the index endpoint. Defaults to `true`. |
| `$perPage` | `int` | Number of records per page when pagination is enabled. Standard Eloquent property. |
| `$middleware` | `array` | Middleware applied to **all** routes for this model. |
| `$middlewareActions` | `array` | Middleware applied to **specific** actions only. Keys are action names (`index`, `show`, `store`, `update`, `destroy`). |
| `$exceptActions` | `array` | List of CRUD actions to exclude from route generation. Valid values: `'index'`, `'show'`, `'store'`, `'update'`, `'destroy'`. |
| `$owner` | `string` | Dot-notation path from this model to the model that holds `organization_id`. Used for nested organization scoping. |

:::tip
You only need to declare properties that differ from their defaults. For example, if you do not need filtering, simply omit `$allowedFilters` entirely.
:::

## Available Traits

Lumina provides a collection of traits that add specific behaviors to your models. Mix and match them as needed.

### HasValidation

Adds declarative validation to your model via `validateStore()` and `validateUpdate()` methods that Lumina calls automatically during `store` and `update` actions.

**Model properties:**

| Property | Type | Description |
|---|---|---|
| `$validationRules` | `array` | Base rules keyed by field name (e.g., `['title' => 'string\|max:255']`). |
| `$validationRulesStore` | `array` | Field names from `$validationRules` that are **required** on creation. |
| `$validationRulesUpdate` | `array` | Field names from `$validationRules` that are **required** on update. |
| `$validationRulesMessages` | `array` | Custom error messages, following the Laravel validation message format. |

```php
use Lumina\LaravelApi\Traits\HasValidation;

class Post extends Model
{
    use HasValidation;

    protected $validationRules = [
        'title'   => 'string|max:255',
        'content' => 'string',
        'status'  => 'string|in:draft,published,archived',
    ];

    // These fields are required when creating a new post
    protected $validationRulesStore = ['title', 'content'];

    // These fields are accepted (but optional) when updating
    protected $validationRulesUpdate = ['title', 'content', 'status'];

    protected $validationRulesMessages = [
        'title.max' => 'Post title cannot exceed 255 characters.',
    ];
}
```

:::info
For a complete breakdown of validation behavior, including how store and update rules interact, see the [Validation](./validation) page.
:::

---

### HasPermissions

Adds role-based permission checking to the **User** model. Lumina uses this trait to authorize API actions automatically when policies are in place.

**Methods:**

| Method | Description |
|---|---|
| `hasPermission(string $permission, ?Organization $org)` | Returns `true` if the user has the given permission within the specified organization. |
| `getRoleSlugForValidation($organization)` | Returns the user's role slug within an organization, used for role-based validation rules. |
| `userRoles()` | Eloquent relationship to the user's role assignments. |

**Permission format:** `{resource_slug}.{action}`

Permissions follow the pattern of the resource slug (the key in your `config/lumina.php` models array) combined with the CRUD action:

- `posts.index` -- can list posts
- `posts.store` -- can create posts
- `blogs.update` -- can update blogs
- `posts.destroy` -- can delete posts

**Wildcard support:**

- `*` -- grants access to everything across all resources
- `posts.*` -- grants access to all actions on posts

```php
use Lumina\LaravelApi\Traits\HasPermissions;

class User extends Model
{
    use HasPermissions;
}

// Check if a user can create posts within an organization
if ($user->hasPermission('posts.store', $organization)) {
    // User can create posts
}

// Check for full access
if ($user->hasPermission('*', $organization)) {
    // User has unrestricted access to everything
}

// Check for all post actions
if ($user->hasPermission('posts.*', $organization)) {
    // User can index, show, store, update, and destroy posts
}
```

---

### HasAuditTrail

Automatically records changes to your model in an audit log. Lumina tracks creation, updates, deletion, force-deletion, and restoration events and stores the old and new values for each change.

**Tracked events:** `created`, `updated`, `deleted`, `force_deleted`, `restored`

**Model properties:**

| Property | Type | Default | Description |
|---|---|---|---|
| `$auditExclude` | `array` | `['password', 'remember_token']` | Fields excluded from audit log entries. Use this to prevent sensitive data from being recorded. |

```php
use Lumina\LaravelApi\Traits\HasAuditTrail;

class User extends Model
{
    use HasAuditTrail;

    // Exclude sensitive fields from audit logs
    protected $auditExclude = ['password', 'remember_token', 'api_token'];
}

// Query the audit trail for any model instance
$logs = $post->auditLogs()->latest()->get();

// Each log entry contains:
// - event (created, updated, deleted, etc.)
// - old_values (previous state)
// - new_values (current state)
// - user_id (who made the change)
// - timestamps
```

The `auditLogs()` method is a polymorphic relationship, so it works identically on any model that uses the trait.

:::info
For full details on querying and managing audit logs, see the [Audit Trail](./audit-trail) page.
:::

---

### HasUuid

Automatically generates a UUID for the model when it is created. The trait hooks into Eloquent's `creating` event and fills the `uuid` column if it is empty.

```php
use Lumina\LaravelApi\Traits\HasUuid;

class Invoice extends Model
{
    use HasUuid;

    // No additional configuration needed.
    // A UUID is generated and assigned to the `uuid` column on creation.
}
```

:::warning
Your database table must have a `uuid` column. Add it in your migration:

```php
$table->uuid('uuid')->unique()->nullable();
```
:::

---

### BelongsToOrganization

Provides multi-tenant organization scoping. This trait automatically filters all queries to the current organization and sets the `organization_id` when creating new records.

**Adds:**

| Member | Type | Description |
|---|---|---|
| `organization()` | BelongsTo relationship | Links the model to its owning organization. |
| `scopeForOrganization($query, $org)` | Query scope | Manually scope a query to a specific organization. |
| Global scope | Automatic | All queries are automatically filtered by `organization_id`. |
| Auto-set on create | Automatic | `organization_id` is filled from the current request context on creation. |

```php
use Lumina\LaravelApi\Traits\BelongsToOrganization;

class Post extends Model
{
    use BelongsToOrganization;

    // All queries are now scoped to the current organization automatically.
    // GET /api/acme-corp/posts -> only returns posts where organization_id matches acme-corp
}
```

**Nested ownership with `$owner`:**

Not every model has a direct `organization_id` column. For nested models, use the `$owner` static property to define the dot-notation path to the nearest model that holds the organization reference.

```php
class Comment extends Model
{
    use BelongsToOrganization;

    // Comment doesn't have organization_id directly.
    // But it belongs to a Post, which belongs to a Blog, which has organization_id.
    public static string $owner = 'post.blog';

    public function post()
    {
        return $this->belongsTo(Post::class);
    }
}
```

In this example, Lumina traverses `Comment -> post -> blog` to find the organization. The chain can be as deep as needed.

:::info
For a full explanation of multi-tenancy and organization scoping, see the [Multi-Tenancy](./multi-tenancy) page.
:::

---

### HidableColumns

Controls which columns are hidden from API responses. This trait provides multiple layers of column visibility control: base defaults, model-level configuration, and policy-based per-user hiding.

**Layers of hidden columns (applied in order):**

1. **Base hidden columns** (always hidden): `password`, `remember_token`, `created_at`, `updated_at`, `deleted_at`, `email_verified_at`
2. **Model-level hidden columns** via `$additionalHiddenColumns`: additional fields to always hide for this model
3. **Policy-level hidden columns** via the `hiddenColumns()` method on the model's policy: per-user dynamic hiding

```php
use Lumina\LaravelApi\Traits\HidableColumns;

class User extends Model
{
    use HidableColumns;

    // Always hide these columns from API responses (in addition to base defaults)
    public static $additionalHiddenColumns = ['api_token', 'stripe_id'];
}
```

:::tip
Hidden columns are cached per user for performance. If you change visibility rules, the cache updates automatically on the next request cycle.
:::

:::info
For policy-based column hiding (showing different fields to different users), see the [Policies](./policies) page.
:::

---

### HasAutoScope

Automatically applies a global scope to the model based on a naming convention. When this trait is used, Lumina looks for a scope class at `App\Models\Scopes\{ModelName}Scope` and applies it if found. No manual registration is needed.

```php
use Lumina\LaravelApi\Traits\HasAutoScope;

class Post extends Model
{
    use HasAutoScope;

    // Automatically loads App\Models\Scopes\PostScope (if it exists)
}
```

Create the corresponding scope class:

```php
<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class PostScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $builder->where('is_visible', true);
    }
}
```

With this in place, every query for `Post` automatically includes `WHERE is_visible = true`. This is useful for soft-visibility flags, status filtering, or any default constraint you want applied globally.

:::tip
The scope is only applied if the class exists. You can safely add the `HasAutoScope` trait to any model without creating the scope class until you need it.
:::

---

### ViewModelHelpers

Adds utility methods for formatting data in API responses. Currently provides currency formatting with support for multiple international currencies.

**Method:** `formatPrice(float $amount, CurrencyOption $currency): string`

**Supported currencies:**

| Enum Value | Symbol | Format Example |
|---|---|---|
| `CurrencyOption::USD` | `$` | `$1,234.56` |
| `CurrencyOption::CAD` | `C$` | `C$1,234.56` |
| `CurrencyOption::GBP` | `£` | `£1,234.56` |
| `CurrencyOption::BRL` | `R$` | `R$1.234,56` |
| `CurrencyOption::EUR` | `€` | `€1.234,56` |
| `CurrencyOption::CHF` | `CHF` | `CHF1,234.56` |

```php
use Lumina\LaravelApi\Traits\ViewModelHelpers;
use Lumina\LaravelApi\Enums\CurrencyOption;

class Product extends Model
{
    use ViewModelHelpers;
}

$product->formatPrice(1234.56, CurrencyOption::USD); // "$1,234.56"
$product->formatPrice(1234.56, CurrencyOption::BRL); // "R$1.234,56"
$product->formatPrice(1234.56, CurrencyOption::EUR); // "€1.234,56"
$product->formatPrice(1234.56, CurrencyOption::GBP); // "£1,234.56"
```

:::info
Note that BRL and EUR use dot as the thousands separator and comma as the decimal separator, matching their regional conventions.
:::

## Complete Model Example

Below is a full real-world model that combines multiple Lumina traits into a feature-rich API resource:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Lumina\LaravelApi\Traits\HasValidation;
use Lumina\LaravelApi\Traits\HasAuditTrail;
use Lumina\LaravelApi\Traits\HasUuid;
use Lumina\LaravelApi\Traits\BelongsToOrganization;
use Lumina\LaravelApi\Traits\HidableColumns;

class BlogPost extends Model
{
    use SoftDeletes, HasValidation, HasAuditTrail, HasUuid, BelongsToOrganization, HidableColumns;

    protected $fillable = [
        'title', 'slug', 'content', 'excerpt',
        'status', 'featured_image', 'user_id',
        'category_id', 'published_at',
    ];

    protected $casts = [
        'published_at' => 'datetime',
    ];

    // ── Validation ───────────────────────────────────────────────
    protected $validationRules = [
        'title'   => 'string|max:255',
        'slug'    => 'string|max:255',
        'content' => 'string',
        'excerpt' => 'string|max:500',
        'status'  => 'string|in:draft,published,archived',
    ];

    protected $validationRulesStore  = ['title', 'content'];
    protected $validationRulesUpdate = ['title', 'content', 'status', 'excerpt'];

    // ── Audit Trail ──────────────────────────────────────────────
    // No extra exclusions beyond the defaults (password, remember_token)
    protected $auditExclude = [];

    // ── Query Configuration ──────────────────────────────────────
    public static $allowedFilters  = ['status', 'user_id', 'category_id'];
    public static $allowedSorts    = ['created_at', 'title', 'published_at'];
    public static $defaultSort     = '-published_at';
    public static $allowedIncludes = ['user', 'category', 'comments', 'tags'];
    public static $allowedSearch   = ['title', 'content', 'excerpt'];
    public static $allowedFields   = ['id', 'title', 'slug', 'excerpt', 'status', 'published_at'];

    // ── Pagination ───────────────────────────────────────────────
    public static bool $paginationEnabled = true;
    protected $perPage = 20;

    // ── Relationships ────────────────────────────────────────────
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function tags()
    {
        return $this->belongsToMany(Tag::class);
    }
}
```

This single model definition gives you:

- **REST endpoints** for listing, showing, creating, updating, and soft-deleting blog posts
- **Filtering** by status, user, and category (`?filter[status]=published`)
- **Sorting** by creation date, title, or publish date (`?sort=-published_at`)
- **Full-text search** across title, content, and excerpt (`?search=laravel`)
- **Eager loading** of user, category, comments, and tags (`?include=user,comments`)
- **Sparse fieldsets** to reduce payload size (`?fields[blog_posts]=id,title,excerpt`)
- **Pagination** at 20 records per page
- **Validation** with different required fields for creation vs. update
- **Audit logging** of every change with before/after values
- **UUID generation** for external-facing identifiers
- **Organization scoping** for multi-tenant data isolation
- **Column hiding** to keep sensitive fields out of API responses

## Registration

Models are registered in `config/lumina.php`. The key becomes the URL slug and the permission prefix:

```php
'models' => [
    'blog-posts' => \App\Models\BlogPost::class,
    'comments'   => \App\Models\Comment::class,
    'categories' => \App\Models\Category::class,
    'tags'       => \App\Models\Tag::class,
],
```

With this configuration, Lumina generates routes such as:

```
GET    /api/{organization}/blog-posts
GET    /api/{organization}/blog-posts/{id}
POST   /api/{organization}/blog-posts
PUT    /api/{organization}/blog-posts/{id}
DELETE /api/{organization}/blog-posts/{id}
```

:::warning
The model key (e.g., `blog-posts`) is used as the permission prefix. Make sure it matches what you use in your role permission definitions (e.g., `blog-posts.store`, `blog-posts.index`).
:::
