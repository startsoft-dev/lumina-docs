# Lumina Laravel Server — Request Lifecycle (Skill)

You are a senior software engineer specialized in **Lumina**, a Laravel package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **Laravel (PHP)** version of Lumina.

---

## What This Skill Covers

This skill covers how every API request flows through Lumina's pipeline: Middleware → Policy → Scope → Query Builder → Response Serialization → Attribute Permissions → JSON Response.

---

## Documentation

### The Request Pipeline

Every API request flows through these layers in order:

```
Request → Middleware → Policy → Scope → Query → Serialize → Hide Columns → Response
```

### 1. Middleware Layer

The first layer. Middleware runs **before** any controller logic and can reject requests early.

Lumina applies middleware in this order:
1. **Global middleware** — Laravel's default stack (CORS, authentication, etc.)
2. **Model middleware** — Defined via `$middleware` on your model (all actions)
3. **Action middleware** — Defined via `$middlewareActions` (specific actions only)

```php
class Post extends Model
{
    public static array $middleware = ['auth:sanctum'];

    public static array $middlewareActions = [
        'store'   => ['verified'],
        'destroy' => ['can:admin'],
    ];
}
```

### 2. Policy Layer

After middleware, Lumina checks the **ResourcePolicy** to determine if the user can perform the action.

| HTTP Method | Action | Policy Method |
|-------------|--------|---------------|
| `GET /posts` | index | `viewAny($user)` |
| `GET /posts/{id}` | show | `view($user, $post)` |
| `POST /posts` | store | `create($user)` |
| `PUT /posts/{id}` | update | `update($user, $post)` |
| `DELETE /posts/{id}` | destroy | `delete($user, $post)` |

If the user lacks the required permission, a `403 Forbidden` response is returned.

### 3. Scope Layer

Determines **which records** the user can see. This is the multi-tenancy boundary.

- Models with `organization_id` are filtered directly
- Nested models use auto-detected BelongsTo chains to traverse relationships back to the organization
- Custom scopes via `HasAutoScope` add additional filtering

```php
// Direct: WHERE organization_id = ?
class Blog extends Model
{
    use BelongsToOrganization;
}

// Nested: WHERE EXISTS (post.blog.organization_id = ?) — auto-detected from BelongsTo
class Comment extends Model
{
    use BelongsToOrganization;
    // ownership path auto-detected from BelongsTo relationships
}
```

### 4. Query Builder

Builds the database query using URL parameters:

| Feature | Query Parameter | Example |
|---------|----------------|---------|
| Filtering | `?filter[field]=value` | `?filter[status]=published` |
| Sorting | `?sort=field` | `?sort=-created_at` |
| Searching | `?search=term` | `?search=laravel` |
| Pagination | `?page=N&per_page=N` | `?page=2&per_page=25` |
| Includes | `?include=relation` | `?include=user,tags` |
| Fields | `?fields[model]=f1,f2` | `?fields[posts]=id,title` |

Only fields declared in `$allowedFilters`, `$allowedSorts`, etc. are accepted. Anything else is silently ignored.

### 5. Response Serialization

Results are serialized into JSON. For `index` endpoints, pagination metadata goes in response headers:

| Header | Description |
|--------|-------------|
| `X-Current-Page` | Current page number |
| `X-Last-Page` | Total number of pages |
| `X-Per-Page` | Items per page |
| `X-Total` | Total number of records |

### 6. Attribute Permissions via Policy

Before sending the response, Lumina checks `permittedAttributesForShow()` and `hiddenAttributesForShow()` to determine which columns are visible per user role:

```php
class PostPolicy extends ResourcePolicy
{
    public function hiddenAttributesForShow(?Authenticatable $user): array
    {
        if ($user?->hasPermission('posts.*')) {
            return []; // Admin sees everything
        }
        return ['internal_notes', 'cost_price'];
    }
}
```

### 7. JSON Response

The final response. Single resource:
```json
{
  "id": 1,
  "title": "My Post",
  "status": "published",
  "created_at": "2025-01-15T10:30:00Z"
}
```

Collections include the data array with pagination headers.

---

## Frequently Asked Questions

**Q: What's the order of the request pipeline?**

A: It flows like this:

```
Request → Middleware → Policy → Scope → Query → Serialize → Hide Columns → Response
```

Each layer is independently configurable. If something's not working, trace the request through these layers to find where the issue is.

**Q: How do I add middleware to a specific model action?**

A: Use `$middlewareActions` on your model:

```php
class Post extends Model
{
    public static array $middlewareActions = [
        'store'   => ['verified'],
        'update'  => ['verified'],
        'destroy' => ['can:admin'],
    ];
}
```

This applies `verified` middleware only to create and update, and `can:admin` only to delete.

**Q: Why is my user seeing fields they shouldn't?**

A: Check your policy's `hiddenAttributesForShow()` and `permittedAttributesForShow()` methods. These control column-level visibility per user role. If you haven't overridden them, the default allows all fields. Add role-based logic:

```php
public function hiddenAttributesForShow(?Authenticatable $user): array
{
    if ($user?->hasPermission('posts.*')) {
        return [];
    }
    return ['secret_field', 'internal_notes'];
}
```

**Q: Where does organization scoping happen in the pipeline?**

A: It happens at step 3 (Scope Layer), after middleware and policy checks pass. The scope automatically filters queries by `organization_id` for models using the `BelongsToOrganization` trait.

**Q: How do I debug why a request is returning 403?**

A: The 403 comes from the Policy Layer (step 2). Check:
1. Does the user have the correct permission? (e.g., `posts.store`)
2. Is the permission assigned to their role in the correct organization?
3. For custom policy methods, are you calling `parent::methodName()` to preserve base checks?

---

## Real-World Examples

### Example 1: Restricting API Access with Middleware

```php
class Invoice extends Model
{
    // All invoice routes require authentication
    public static array $middleware = ['auth:sanctum'];

    // Only verified users can create invoices
    // Rate limit updates to 30/min
    public static array $middlewareActions = [
        'store'  => ['verified'],
        'update' => ['throttle:30,1'],
    ];
}
```

### Example 2: Role-Based Field Visibility

An HR system where managers see salary info but regular employees don't:

```php
class EmployeePolicy extends ResourcePolicy
{
    public function permittedAttributesForShow(?Authenticatable $user): array
    {
        if ($this->hasRole($user, 'manager')) {
            return ['*']; // Managers see everything
        }
        return ['id', 'name', 'department', 'title']; // Others see basic info
    }

    public function hiddenAttributesForShow(?Authenticatable $user): array
    {
        if ($this->hasRole($user, 'manager')) {
            return [];
        }
        return ['salary', 'ssn', 'bank_account'];
    }
}
```
