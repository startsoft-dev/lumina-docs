# Lumina Laravel Server — Route Groups (Skill)

You are a senior software engineer specialized in **Lumina**, a Laravel package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **Laravel (PHP)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's route groups: configuration, reserved group names (`tenant` and `public`), hybrid platform setups, route naming, organization scoping behavior, custom scoping for non-tenant groups, and permission resolution.

---

## Documentation

### Configuration

```php
// config/lumina.php
'route_groups' => [
    'group-name' => [
        'prefix' => 'url-prefix',
        'middleware' => [SomeMiddleware::class],
        'models' => '*', // or ['posts', 'comments']
    ],
],
```

### Reserved Group Names

| Name | Behavior |
|------|----------|
| `'tenant'` | Invitation and nested routes registered under this prefix |
| `'public'` | `auth:sanctum` middleware is **skipped** |

### Model Selection

- `'models' => '*'` — all models from config
- `'models' => ['posts', 'categories']` — only specified slugs

### Examples

**Simple Non-Tenant App:**
```php
'route_groups' => [
    'default' => [
        'prefix' => '',
        'middleware' => [],
        'models' => '*',
    ],
],
```

**Simple Multi-Tenant:**
```php
'route_groups' => [
    'tenant' => [
        'prefix' => '{organization}',
        'middleware' => [ResolveOrganizationFromRoute::class],
        'models' => '*',
    ],
],
```

**Hybrid Platform (Logistics):**
```php
'route_groups' => [
    'tenant' => [
        'prefix' => '{organization}',
        'middleware' => [ResolveOrganizationFromRoute::class],
        'models' => '*',
    ],
    'driver' => [
        'prefix' => 'driver',
        'middleware' => [],
        'models' => ['trips', 'construction-sites', 'trucks'],
    ],
    'admin' => [
        'prefix' => 'admin',
        'middleware' => [],
        'models' => '*',
    ],
    'public' => [
        'prefix' => 'public',
        'middleware' => [],
        'models' => ['materials'],
    ],
],
```

Generated routes:

| Group | Example Route | Auth | Org Scoped |
|-------|------|------|------|
| tenant | `GET /api/acme-corp/trips` | sanctum | Yes |
| driver | `GET /api/driver/trips` | sanctum | No |
| admin | `GET /api/admin/trips` | sanctum | No |
| public | `GET /api/public/materials` | None | No |

### Route Naming

Pattern: `{group}.{model}.{action}` — e.g., `tenant.trips.index`, `driver.trucks.show`

### Organization Scoping

Scoping is implicit. The `GlobalController` checks if the request has an organization:
- **Tenant group** → middleware sets org → scoping applied
- **Other groups** → no org → scoping skipped

### Custom Scoping for Non-Tenant Groups

Use global scopes for custom filtering (e.g., driver sees only their trips):

```php
class DriverScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $user = auth()->user();
        $routeGroup = request()->route()?->defaults['route_group'] ?? null;

        if ($routeGroup === 'driver' && $user) {
            $builder->where('driver_id', $user->driver_id);
        }
    }
}
```

```php
class Trip extends Model
{
    protected static function booted(): void
    {
        static::addGlobalScope(new DriverScope);
    }
}
```

### Permission Resolution

| Route Group | Permission Source |
|-------------|-----------------|
| `tenant` | `user_roles.permissions` (org-scoped) |
| Any other | `users.permissions` (user-level) |

Setup: add `permissions` JSON column to `users` table and `HasPermissions` trait.

```php
$driver->update(['permissions' => ['trips.index', 'trips.show', 'trucks.*']]);
$admin->update(['permissions' => ['*']]);
```

---

## Frequently Asked Questions

**Q: What are route groups for?**

A: Route groups let you expose the same models under different URL prefixes with different middleware and authentication. This is essential for hybrid platforms — for example, a logistics app where customers access data through org-scoped routes, drivers through a driver-specific prefix, and admins through an admin prefix.

**Q: What's special about the `tenant` and `public` group names?**

A: `tenant` gets invitation and nested operation routes registered under its prefix. `public` skips `auth:sanctum` middleware entirely. All other names are standard authenticated groups.

**Q: How does permission checking work across route groups?**

A: For the `tenant` group, permissions come from `user_roles.permissions` (org-scoped). For all other groups, permissions come from `users.permissions` (user-level JSON column).

**Q: How do I make a driver only see their own trips?**

A: Create a global scope that checks the route group:

```php
class DriverScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $routeGroup = request()->route()?->defaults['route_group'] ?? null;
        if ($routeGroup === 'driver' && auth()->user()) {
            $builder->where('driver_id', auth()->user()->driver_id);
        }
    }
}
```

The scope only activates for the `driver` route group. Admin and tenant routes are unaffected.

**Q: How do I migrate from the old config format?**

A: Move `'public'` and `'multi_tenant'` settings into `'route_groups'`:

```php
// Before
'public' => ['materials'],
'multi_tenant' => ['enabled' => true, 'middleware' => ResolveOrganizationFromRoute::class],

// After
'route_groups' => [
    'tenant' => [
        'prefix' => '{organization}',
        'middleware' => [ResolveOrganizationFromRoute::class],
        'models' => '*',
    ],
    'public' => [
        'prefix' => '',
        'middleware' => [],
        'models' => ['materials'],
    ],
],
```

---

## Real-World Examples

### Logistics Platform Request Flow

**Customer:** `GET /api/acme-corp/trips`
1. Route: `tenant.trips.index`
2. Auth via sanctum
3. Org resolved from URL → scoped to Acme Corp
4. Returns only Acme Corp's trips

**Driver:** `GET /api/driver/trips`
1. Route: `driver.trips.index`
2. Auth via sanctum
3. No org → `DriverScope` filters by `driver_id`
4. Returns only this driver's trips

**Admin:** `GET /api/admin/trips`
1. Route: `admin.trips.index`
2. Auth via sanctum
3. No org, no driver scope → returns all trips

**Public:** `GET /api/public/materials`
1. Route: `public.materials.index`
2. No auth needed
3. Returns all materials
