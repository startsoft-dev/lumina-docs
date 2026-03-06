# Lumina Server Patterns Reference

Complete reference for all server-side patterns in the Lumina Laravel API framework.

---

## Traits

All traits are in the `Lumina\LaravelApi\Traits` namespace.

### HasValidation

**Namespace:** `Lumina\LaravelApi\Traits\HasValidation`

Provides model-level validation for store and update operations. Reads `$validationRules`, `$validationRulesStore`, `$validationRulesUpdate`, and `$validationRulesMessages` from the model.

**Methods:**
- `validateStore(Request $request): \Illuminate\Validation\Validator`
- `validateUpdate(Request $request): \Illuminate\Validation\Validator`

### HidableColumns

**Namespace:** `Lumina\LaravelApi\Traits\HidableColumns`

Automatically hides sensitive columns from JSON serialization. Merges base hidden columns with policy-driven dynamic hidden columns.

**Base hidden columns (always hidden):**
- `password`, `remember_token`, `has_temporary_password`
- `updated_at`, `created_at`, `deleted_at`, `email_verified_at`

**Model properties:**
- `protected $additionalHiddenColumns = ['field1', 'field2']` -- always hidden on this model
- Policy `hiddenColumns()` method -- dynamic, based on authenticated user

**Methods:**
- `getHidden(): array` -- overrides Laravel's method, merges all hidden column sources
- `hideAdditionalColumns(array $columns)` -- programmatically hide more columns
- `static clearHiddenColumnsCache(): void` -- clear per-request cache

### BelongsToOrganization

**Namespace:** `Lumina\LaravelApi\Traits\BelongsToOrganization`

For models with a direct `organization_id` column. Automatically:
- Sets `organization_id` on creation from the request's organization context
- Adds a global scope filtering by `organization_id`
- Provides `organization()` BelongsTo relationship
- Provides `scopeForOrganization(Builder $query, Organization $organization)` scope

### HasAuditTrail

**Namespace:** `Lumina\LaravelApi\Traits\HasAuditTrail`

Automatic audit logging on model events: `created`, `updated`, `deleted`, `force_deleted`, `restored`.

**Model properties:**
- `public static $auditExclude = ['password', 'remember_token']` -- columns to exclude from audit

**Methods:**
- `auditLogs(): MorphMany` -- relationship to audit log entries
- `getAuditExclude(): array` -- columns excluded from logging

**Audit log fields:** `auditable_type`, `auditable_id`, `action`, `old_values`, `new_values`, `user_id`, `ip_address`, `user_agent`, `organization_id`

### HasAutoScope

**Namespace:** `Lumina\LaravelApi\Traits\HasAutoScope`

Auto-discovers and registers a global scope by convention. Looks for `App\Models\Scopes\{ModelName}Scope` class.

### HasUuid

**Namespace:** `Lumina\LaravelApi\Traits\HasUuid`

Automatically generates a UUID on model creation if the `uuid` column is empty.

### HasPermissions

**Namespace:** `Lumina\LaravelApi\Traits\HasPermissions`

Applied to the User model. Provides permission checking.

**Methods:**
- `hasPermission(string $permission, $organization = null): bool` -- check `{slug}.{action}` permission. Supports wildcards: `*` (all), `posts.*` (all actions on posts).
- `getRoleSlugForValidation($organization): ?string` -- returns the user's role slug in the given organization (e.g., `'admin'`, `'editor'`).
- `userRoles(): HasMany` -- relationship to UserRole pivot.

---

## Model Properties

### Required Properties

```php
protected $fillable = ['field1', 'field2'];

protected $validationRules = [
    'field1' => 'required|string|max:255',
    'field2' => 'integer|min:0',
];

protected $validationRulesStore = ['field1', 'field2'];  // simple format
protected $validationRulesUpdate = ['field1'];            // simple format
```

### Query Builder Properties (static)

```php
protected static $allowedFilters = ['status', 'category_id'];
protected static $allowedSorts = ['title', 'created_at', 'updated_at'];
protected static $defaultSort = '-created_at';
protected static $allowedFields = ['id', 'title', 'body', 'status'];
protected static $allowedIncludes = ['author', 'comments', 'tags'];
protected static $allowedSearch = ['title', 'body'];
```

### Pagination Properties

```php
protected $paginationEnabled = true;
protected $perPage = 25;
```

### Middleware Properties (static)

```php
public static array $middleware = [SomeMiddleware::class];
public static array $middlewareActions = [
    'store' => [ThrottleMiddleware::class],
    'show' => [LogAccessMiddleware::class],
];
protected $exceptActions = ['destroy'];
```

### Multi-Tenancy

Indirect ownership is auto-detected from BelongsTo relationships. Just define the `belongsTo` relationship and Lumina will walk the chain to find the organization.

---

## Validation Patterns

### Simple Format (uniform for all roles)

```php
protected $validationRulesStore = ['title', 'body', 'category_id'];
protected $validationRulesUpdate = ['title'];
```

### Presence Modifiers (simple format)

```php
protected $validationRulesStore = [
    'title',                // inherits presence from $validationRules
    'required:body',        // explicitly required
    'nullable:subtitle',    // allowed to be null
    'sometimes:priority',   // only validated if present
];
```

### Full Override with Pipe (simple format)

```php
protected $validationRulesStore = [
    'title',
    'slug|required|string|unique:articles,slug',  // completely replaces base rule
];
```

### Role-Based Format

```php
protected $validationRulesStore = [
    'admin' => [
        'title' => 'required',
        'body' => 'required',
        'status' => 'nullable',
        'featured' => 'nullable',
    ],
    'editor' => [
        'title' => 'required',
        'body' => 'required',
        'status' => 'nullable',
    ],
    '*' => [                          // fallback for unlisted roles
        'title' => 'required',
        'body' => 'required',
    ],
];
```

**Key behaviors:**
- Fields not listed for a role are silently stripped (not rejected)
- The `*` key is a fallback for roles not explicitly listed
- Do not mix simple and role-based formats in the same array
- Role resolution uses `HasRoleBasedValidation` contract: `getRoleSlugForValidation()`

### Custom Messages

```php
protected $validationRulesMessages = [
    'title.required' => 'A title is required.',
    'status.in' => 'Status must be draft, published, or archived.',
];
```

---

## Policy Patterns

### Base Policy

```php
namespace App\Policies;

use Lumina\LaravelApi\Policies\ResourcePolicy;

class PostPolicy extends ResourcePolicy
{
    // Inherits all CRUD methods from ResourcePolicy
    // Permission checked via {slug}.{action} format automatically
}
```

### ResourcePolicy Base Methods

All methods can be overridden:

```php
public function viewAny(?Authenticatable $user): bool      // checks {slug}.index
public function view(?Authenticatable $user, $model): bool  // checks {slug}.show
public function create(?Authenticatable $user): bool        // checks {slug}.store
public function update(?Authenticatable $user, $model): bool // checks {slug}.update
public function delete(?Authenticatable $user, $model): bool // checks {slug}.destroy
public function viewTrashed(?Authenticatable $user): bool   // checks {slug}.trashed
public function restore(?Authenticatable $user, $model): bool // checks {slug}.restore
public function forceDelete(?Authenticatable $user, $model): bool // checks {slug}.forceDelete
public function hiddenColumns(?Authenticatable $user): array // default: []
```

### Custom Override Pattern

```php
public function delete(?Authenticatable $user, $model): bool
{
    // Always call parent first for permission check
    if (!parent::delete($user, $model)) {
        return false;
    }
    // Then add custom condition
    return $user->id === $model->author_id;
}
```

### Hidden Columns Pattern

```php
public function hiddenColumns(?Authenticatable $user): array
{
    if (!$user) {
        return ['internal_notes', 'cost', 'email'];
    }

    $organization = request()->get('organization');
    $roleSlug = $user->getRoleSlugForValidation($organization);

    return match ($roleSlug) {
        'admin' => [],
        'editor' => ['cost'],
        default => ['internal_notes', 'cost'],
    };
}
```

### ResourcePolicy Properties

```php
protected ?string $resourceSlug = null;  // override for custom slug; auto-resolved from config if null
```

---

## Scope Patterns

### Basic Scope

```php
namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class PostScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $user = auth('sanctum')->user();
        if (!$user) return;

        $organization = request()->get('organization');
        $roleSlug = $user->getRoleSlugForValidation($organization);

        if ($roleSlug !== 'admin') {
            $builder->where('is_published', true);
        }
    }
}
```

### Registration

**Manual (in model booted):**
```php
protected static function booted(): void
{
    static::addGlobalScope(new \App\Models\Scopes\PostScope);
}
```

**Automatic (via HasAutoScope trait):**
```php
use Lumina\LaravelApi\Traits\HasAutoScope;

class Post extends Model
{
    use HasAutoScope; // auto-discovers App\Models\Scopes\PostScope
}
```

### User Model Scope (anti-recursion pattern)

The User model requires special handling to avoid infinite recursion during authentication:

```php
class UserScope implements Scope
{
    private static $applying = false;

    public function apply(Builder $builder, Model $model): void
    {
        if (self::$applying) return;

        // Check backtrace for auth context
        $backtrace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 15);
        foreach ($backtrace as $frame) {
            $class = $frame['class'] ?? '';
            if (str_contains($class, 'Laravel\\Sanctum') ||
                str_contains($class, 'Illuminate\\Auth')) {
                return;
            }
        }

        try {
            $user = request()->user('sanctum');
            if ($user && isset($user->id)) {
                self::$applying = true;
                try {
                    $builder->where('id', $user->id);
                } finally {
                    self::$applying = false;
                }
            }
        } catch (\Exception $e) {
            return;
        }
    }
}
```

---

## Route Patterns

Lumina auto-generates routes based on `config/lumina.php` registration. The URL pattern is:

```
/api/{organization_slug}/{model_slug}
```

When multi-tenancy is disabled, the pattern is:

```
/api/{model_slug}
```

### Auto-Generated Routes

| Method | URL | Action | Policy Method |
|--------|-----|--------|---------------|
| GET | `/api/{org}/{slug}` | index | viewAny |
| GET | `/api/{org}/{slug}/{id}` | show | view |
| POST | `/api/{org}/{slug}` | store | create |
| PUT | `/api/{org}/{slug}/{id}` | update | update |
| DELETE | `/api/{org}/{slug}/{id}` | destroy | delete |
| GET | `/api/{org}/{slug}/trashed` | trashed | viewTrashed |
| POST | `/api/{org}/{slug}/{id}/restore` | restore | restore |
| DELETE | `/api/{org}/{slug}/{id}/force` | forceDelete | forceDelete |
| GET | `/api/{org}/{slug}/{id}/audit` | audit | (uses view) |

### Special Routes

| Method | URL | Purpose |
|--------|-----|---------|
| POST | `/api/{org}/nested-operations` | Nested multi-model operations |
| GET | `/api/{org}/invitations` | List invitations |
| POST | `/api/{org}/invitations` | Create invitation |
| POST | `/api/{org}/invitations/{id}/resend` | Resend invitation |
| DELETE | `/api/{org}/invitations/{id}` | Cancel invitation |
| POST | `/api/invitations/accept` | Accept invitation |

---

## Config Reference

```php
// config/lumina.php
return [
    'models' => [
        'slug' => \App\Models\ModelClass::class,
    ],
    'public' => [
        // slugs accessible without authentication
    ],
    'multi_tenant' => [
        'enabled' => true,
        'use_subdomain' => false,
        'organization_identifier_column' => 'slug',  // 'id', 'slug', or custom column
        'middleware' => \Lumina\LaravelApi\Http\Middleware\ResolveOrganizationFromRoute::class,
    ],
    'invitations' => [
        'expires_days' => 7,
        'allowed_roles' => null,  // null = all roles; or array of role slugs
    ],
    'nested' => [
        'path' => 'nested',
        'max_operations' => 50,
        'allowed_models' => null,  // null = all; or array of slugs
    ],
    'test_framework' => 'pest',    // 'pest' or 'phpunit'
    'postman' => [
        'role_class' => 'App\Models\Role',
        'user_role_class' => 'App\Models\UserRole',
        'user_class' => 'App\Models\User',
    ],
];
```

---

## Complete Model Example

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Lumina\LaravelApi\Traits\BelongsToOrganization;
use Lumina\LaravelApi\Traits\HasAuditTrail;
use Lumina\LaravelApi\Traits\HasValidation;
use Lumina\LaravelApi\Traits\HidableColumns;

class Invoice extends Model
{
    use HasFactory, SoftDeletes, HasValidation, HidableColumns;
    use BelongsToOrganization, HasAuditTrail;

    protected $fillable = [
        'organization_id',
        'client_id',
        'number',
        'amount',
        'status',
        'due_date',
        'notes',
    ];

    protected $validationRules = [
        'client_id' => 'exists:clients,id',
        'number' => 'string|max:50',
        'amount' => 'numeric|min:0',
        'status' => 'in:draft,sent,paid,overdue,cancelled',
        'due_date' => 'date',
        'notes' => 'string|max:1000',
    ];

    protected $validationRulesStore = [
        'admin' => [
            'client_id' => 'required',
            'number' => 'required',
            'amount' => 'required',
            'status' => 'nullable',
            'due_date' => 'required',
            'notes' => 'nullable',
        ],
        'editor' => [
            'client_id' => 'required',
            'number' => 'required',
            'amount' => 'required',
            'due_date' => 'required',
        ],
        '*' => [],
    ];

    protected $validationRulesUpdate = [
        'admin' => [
            'amount' => 'sometimes',
            'status' => 'sometimes',
            'due_date' => 'sometimes',
            'notes' => 'nullable',
        ],
        'editor' => [
            'amount' => 'sometimes',
            'due_date' => 'sometimes',
        ],
        '*' => [],
    ];

    protected static $allowedFilters = ['status', 'client_id', 'due_date'];
    protected static $allowedSorts = ['number', 'amount', 'due_date', 'created_at'];
    protected static $defaultSort = '-created_at';
    protected static $allowedFields = ['id', 'number', 'amount', 'status', 'due_date', 'client_id'];
    protected static $allowedIncludes = ['client', 'organization', 'lineItems'];
    protected static $allowedSearch = ['number', 'notes'];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function lineItems()
    {
        return $this->hasMany(InvoiceLineItem::class);
    }
}
```
