# Lumina Project Instructions

Lumina is an automatic REST API generation framework for Laravel with a React/React Native client library (`@startsoft/lumina`). Models are registered in `config/lumina.php` and routes are auto-generated. Authorization uses a three-layer system: Policy (action authorization) -> Policy.hiddenColumns (column visibility) -> Scope (data filtering). All role-based, never ownership-based.

## Architecture Overview

- **Server package:** `startsoft/lumina` (Composer) -- provides traits, base policies, scopes, middleware, and a global controller that auto-generates REST routes for registered models.
- **Client package:** `@startsoft/lumina` (npm) -- React hooks built on TanStack Query 5 for CRUD, pagination, soft deletes, nested operations, invitations, and multi-tenant support.
- **Config:** `config/lumina.php` -- register models by slug, configure multi-tenancy, invitations, and nested operations.

### Three-Layer Authorization

1. **Policy** (action authorization) -- determines if a user can perform an action (viewAny, view, create, update, delete, viewTrashed, restore, forceDelete). Extends `Lumina\LaravelApi\Policies\ResourcePolicy`. Permission format: `{slug}.{action}` (e.g., `posts.index`, `blogs.store`). Supports wildcards (`*`, `posts.*`).
2. **Policy.hiddenColumns** (column visibility) -- determines which columns are hidden from the JSON response based on the authenticated user. Override `hiddenColumns(?Authenticatable $user): array` in the policy.
3. **Scope** (data filtering) -- filters which records a user can see. Implements `Illuminate\Database\Eloquent\Scope`. Registered in the model's `booted()` method or auto-discovered via `HasAutoScope` trait (convention: `App\Models\Scopes\{ModelName}Scope`).

### Request Lifecycle

```
Request -> Middleware -> Policy (action auth) -> Scope (data filtering)
-> Query Builder (filters/sorts/search/includes/fields/pagination)
-> Serialization -> Hidden Columns (policy) -> JSON Response
```

### Multi-Tenancy

- **Direct:** Model has `organization_id` column -- use `BelongsToOrganization` trait. Automatically filters by organization and sets `organization_id` on creation.
- **Indirect:** Model belongs to organization through another model -- Lumina auto-detects the path by introspecting BelongsTo relationships.

---

## Server Conventions

### Model Structure

Every Lumina model must use these traits:

```php
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Lumina\LaravelApi\Traits\HasValidation;
use Lumina\LaravelApi\Traits\HidableColumns;
```

Optional traits:
- `Lumina\LaravelApi\Traits\BelongsToOrganization` -- direct multi-tenancy (model has `organization_id`)
- `Lumina\LaravelApi\Traits\HasAuditTrail` -- automatic audit logging (created, updated, deleted, restored events)
- `Lumina\LaravelApi\Traits\HasAutoScope` -- auto-discovers scope from `App\Models\Scopes\{ModelName}Scope`
- `Lumina\LaravelApi\Traits\HasUuid` -- auto-generates UUID on creation
- `Lumina\LaravelApi\Traits\HasPermissions` -- adds `hasPermission()` and `getRoleSlugForValidation()` to User model

### Required Model Properties

```php
// Mass assignment
protected $fillable = ['title', 'body', 'status', 'category_id'];

// Base validation rules (applied to both store and update)
protected $validationRules = [
    'title' => 'required|string|max:255',
    'body' => 'required|string',
    'status' => 'in:draft,published,archived',
];

// Fields active on store (simple format: field names referencing $validationRules keys)
protected $validationRulesStore = ['title', 'body'];

// Fields active on update
protected $validationRulesUpdate = ['title'];
```

### Query Builder Properties (static)

```php
protected static $allowedFilters = ['status', 'category_id'];    // ?filter[status]=published
protected static $allowedSorts = ['title', 'created_at'];         // ?sort=-created_at
protected static $defaultSort = '-created_at';                     // default sort
protected static $allowedFields = ['id', 'title', 'body'];        // ?fields[model]=id,title
protected static $allowedIncludes = ['author', 'comments'];        // ?include=author,comments
protected static $allowedSearch = ['title', 'body'];               // ?search=term
```

### Pagination

```php
protected $paginationEnabled = true;  // default: true
protected $perPage = 25;              // default: 15
```

### Middleware (on the model, not in controllers)

```php
public static array $middleware = ['verified'];
public static array $middlewareActions = [
    'store' => ['throttle:10,1'],
    'show' => [SomeMiddleware::class],
];
protected $exceptActions = ['destroy'];  // exclude CRUD actions
```

### Multi-Tenancy

```php
// Direct: model has organization_id column
use Lumina\LaravelApi\Traits\BelongsToOrganization;

// Indirect: auto-detected from BelongsTo relationships
// Just define the belongsTo relationship and Lumina walks the chain automatically.
```

### Role-Based Validation

For models where different roles can edit different fields, use associative arrays keyed by role slug:

```php
protected $validationRulesStore = [
    'admin' => [
        'title' => 'required',
        'body' => 'required',
        'featured' => 'nullable',
    ],
    'editor' => [
        'title' => 'required',
        'body' => 'required',
    ],
    '*' => [                          // fallback for unlisted roles
        'title' => 'required',
        'body' => 'required',
    ],
];
```

Key behavior: fields not listed for a role are silently stripped from the request (security feature).

Presence modifiers in simple format: `required:body`, `nullable:subtitle`, `sometimes:priority`.
Full override with pipe: `slug|required|string|unique:articles,slug`.

### Policies

Policies extend `Lumina\LaravelApi\Policies\ResourcePolicy`:

```php
namespace App\Policies;

use Illuminate\Contracts\Auth\Authenticatable;
use Lumina\LaravelApi\Policies\ResourcePolicy;

class PostPolicy extends ResourcePolicy
{
    // Override any method for custom logic
    public function delete(?Authenticatable $user, $model): bool
    {
        if (!parent::delete($user, $model)) {
            return false;
        }
        return $user->id === $model->author_id;
    }

    // Hide columns based on user role
    public function hiddenColumns(?Authenticatable $user): array
    {
        if (!$user) {
            return ['internal_notes', 'cost'];
        }

        $organization = request()->get('organization');
        $isAdmin = $user->rolesInOrganization($organization)
            ->where('slug', 'admin')->exists();

        return $isAdmin ? [] : ['internal_notes', 'cost'];
    }
}
```

Role checking pattern:
```php
$user->rolesInOrganization(request()->get('organization'))->where('slug', 'admin')->exists()
```

### Scopes

Implement `Illuminate\Database\Eloquent\Scope`:

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

        // Admins see everything; others see only published
        if ($roleSlug !== 'admin') {
            $builder->where('is_published', true);
        }
    }
}
```

Register in the model's `booted()` method:
```php
protected static function booted(): void
{
    static::addGlobalScope(new \App\Models\Scopes\PostScope);
}
```

Or use the `HasAutoScope` trait for convention-based auto-discovery (`App\Models\Scopes\{ModelName}Scope`).

### Config Registration

```php
// config/lumina.php
return [
    'models' => [
        'posts' => \App\Models\Post::class,       // slug => model class
        'blogs' => \App\Models\Blog::class,
    ],
    'public' => [],                                 // slugs accessible without auth
    'multi_tenant' => [
        'enabled' => true,
        'use_subdomain' => false,
        'organization_identifier_column' => 'slug',
        'middleware' => \Lumina\LaravelApi\Http\Middleware\ResolveOrganizationFromRoute::class,
    ],
    'invitations' => [
        'expires_days' => 7,
        'allowed_roles' => null,                    // null = all roles can invite
    ],
    'nested' => [
        'path' => 'nested',
        'max_operations' => 50,
        'allowed_models' => null,                   // null = all registered models
    ],
];
```

### Audit Trail

Add `HasAuditTrail` trait to the model. Logs created, updated, deleted, restored events. Customize excluded columns:

```php
use Lumina\LaravelApi\Traits\HasAuditTrail;

class Post extends Model
{
    use HasAuditTrail;

    public static $auditExclude = ['password', 'remember_token'];
}
```

---

## Client Conventions

Package: `@startsoft/lumina`

### Configuration

```typescript
import { configureApi } from '@startsoft/lumina';

// Web (Vite)
configureApi({ baseURL: import.meta.env.VITE_API_URL });

// React Native
configureApi({
  baseURL: 'https://api.example.com/api',
  onUnauthorized: () => navigation.navigate('Login'),
});
```

### Auth Provider

Wrap your app with `AuthProvider`:

```tsx
import { AuthProvider } from '@startsoft/lumina';

function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
```

### Authentication

```typescript
import { useAuth } from '@startsoft/lumina';

const { token, isAuthenticated, login, logout, setOrganization } = useAuth();
// login(email, password) -> Promise<LoginResult>
// logout() -> Promise<void>
// setOrganization(slug) -> void
```

### CRUD Hooks

```typescript
import {
  useModelIndex,    // list with pagination, filtering, search, sorting, includes
  useModelShow,     // single record by ID
  useModelStore,    // create new record
  useModelUpdate,   // update existing record
  useModelDelete,   // soft delete
} from '@startsoft/lumina';

// Index
const { data: response } = useModelIndex('posts', {
  page: 1, perPage: 20, search: 'react',
  filters: { status: 'published' },
  includes: ['author'], sort: '-created_at',
  fields: ['id', 'title', 'created_at'],
});
const posts = response?.data || [];
const pagination = response?.pagination;

// Show
const { data: post } = useModelShow('posts', postId, {
  includes: ['author', 'comments'],
});

// Store
const createPost = useModelStore('posts');
createPost.mutate({ title: 'New Post', content: '...' });

// Update
const updatePost = useModelUpdate('posts');
updatePost.mutate({ id: postId, data: { title: 'Updated' } });

// Delete
const deletePost = useModelDelete('posts');
deletePost.mutate(postId);
```

### Soft Delete Hooks

```typescript
import { useModelTrashed, useModelRestore, useModelForceDelete } from '@startsoft/lumina';

const { data: trashed } = useModelTrashed('posts', { sort: '-deleted_at' });
const restore = useModelRestore('posts');
restore.mutate(postId);
const forceDelete = useModelForceDelete('posts');
forceDelete.mutate(postId);
```

### Nested Operations

```typescript
import { useNestedOperations } from '@startsoft/lumina';

const nestedOps = useNestedOperations();
nestedOps.mutate({
  operations: [
    { action: 'create', model: 'blogs', data: { title: 'My Blog' } },
    { action: 'create', model: 'posts', data: { title: 'First Post', blog_id: '$0.id' } },
  ],
});
// Use $N.field to reference results from previous operations
```

### Invitations

```typescript
import {
  useInvitations,        // list invitations with status filter
  useInviteUser,         // mutate({ email, role_id })
  useResendInvitation,   // mutate(invitationId)
  useCancelInvitation,   // mutate(invitationId)
  useAcceptInvitation,   // mutate({ token, password? })
} from '@startsoft/lumina';
```

### Organization Hooks

```typescript
import { useOrganization, useOwner, useOrganizationExists } from '@startsoft/lumina';

const orgSlug = useOrganization();                          // current org slug
const { data: org } = useOwner({ includes: ['users'] });    // org data with relations
const { data } = useOrganizationExists('acme-corp');        // { exists: boolean }
```

### Utilities

```typescript
import { api, configureApi } from '@startsoft/lumina';         // configured Axios instance
import { storage, createWebStorage } from '@startsoft/lumina';  // storage adapter
import { events, createWebEvents } from '@startsoft/lumina';    // event emitter
import { extractPaginationFromHeaders } from '@startsoft/lumina'; // parse pagination headers
import { cn } from '@startsoft/lumina';                         // className merge utility
```

All hooks auto-scope to the current organization. Pagination metadata is extracted from response headers (`X-Current-Page`, `X-Last-Page`, `X-Per-Page`, `X-Total`).

---

## Common Tasks

### Adding a New Model (Server)

1. Create migration: `php artisan make:migration create_posts_table`
2. Create model with traits: `HasFactory`, `SoftDeletes`, `HasValidation`, `HidableColumns` (+ `BelongsToOrganization` if direct tenant)
3. Define `$fillable`, `$validationRules`, `$validationRulesStore`, `$validationRulesUpdate`
4. Define static query properties: `$allowedFilters`, `$allowedSorts`, `$defaultSort`, `$allowedFields`, `$allowedIncludes`, `$allowedSearch`
5. Create policy extending `ResourcePolicy`, override `hiddenColumns()` if needed
6. Create scope in `app/Models/Scopes/{ModelName}Scope.php` if role-based filtering needed
7. Register in `config/lumina.php` under `models` key: `'posts' => \App\Models\Post::class`
8. Create factory: `php artisan make:factory PostFactory`

### Adding React CRUD (Client)

1. Create TypeScript interface for the model
2. Create list component using `useModelIndex` with search, filter, pagination
3. Create detail component using `useModelShow`
4. Create form component using `useModelStore` (create) and `useModelUpdate` (edit)
5. Create delete button using `useModelDelete`

### API URL Pattern

```
GET    /api/{organization}/{model}              -> index (useModelIndex)
GET    /api/{organization}/{model}/{id}          -> show (useModelShow)
POST   /api/{organization}/{model}              -> store (useModelStore)
PUT    /api/{organization}/{model}/{id}          -> update (useModelUpdate)
DELETE /api/{organization}/{model}/{id}          -> destroy (useModelDelete)
GET    /api/{organization}/{model}/trashed       -> trashed (useModelTrashed)
POST   /api/{organization}/{model}/{id}/restore  -> restore (useModelRestore)
DELETE /api/{organization}/{model}/{id}/force    -> forceDelete (useModelForceDelete)
GET    /api/{organization}/{model}/{id}/audit    -> audit (useModelAudit)
POST   /api/{organization}/nested-operations     -> nested (useNestedOperations)
POST   /api/{organization}/invitations           -> invite (useInviteUser)
GET    /api/{organization}/invitations           -> list (useInvitations)
```
