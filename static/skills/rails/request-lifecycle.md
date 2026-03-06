# Lumina Rails Server — Request Lifecycle (Skill)

You are a senior software engineer specialized in **Lumina**, a Rails gem that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **Rails (Ruby)** version of Lumina.

---

## What This Skill Covers

This skill covers how every API request flows through Lumina's pipeline: Middleware, Policy, Scope, Query Builder, Response Serialization, Attribute Permissions, and JSON Response.

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
1. **Global middleware** — Rails default stack (CORS, authentication, etc.)
2. **Model middleware** — Defined via `lumina_middleware` on your model (all actions)
3. **Action middleware** — Defined via `lumina_middleware_actions` (specific actions only)

```ruby
class Post < LuminaModel
  lumina_middleware :authenticate_user!

  lumina_middleware_actions(
    create:  [:verify_email!],
    destroy: [:require_admin!],
  )
end
```

### 2. Policy Layer

After middleware, Lumina checks the **ResourcePolicy** (via Pundit) to determine if the user can perform the action.

| HTTP Method | Action | Policy Method | Alias |
|-------------|--------|---------------|-------|
| `GET /posts` | index | `index?(user)` | `view_any?(user)` |
| `GET /posts/:id` | show | `show?(user, post)` | `view?(user, post)` |
| `POST /posts` | create | `create?(user)` | — |
| `PUT /posts/:id` | update | `update?(user, post)` | — |
| `DELETE /posts/:id` | destroy | `destroy?(user, post)` | `delete?(user, post)` |

If the user lacks the required permission, a `403 Forbidden` response is returned.

### 3. Scope Layer

Determines **which records** the user can see. This is the multi-tenancy boundary.

- Models with `organization_id` are filtered directly
- Nested models use auto-detected `belongs_to` chains to traverse relationships back to the organization
- Custom scopes via `HasAutoScope` add additional filtering

```ruby
# Direct: WHERE organization_id = ?
class Blog < LuminaModel
  include BelongsToOrganization
end

# Nested: WHERE EXISTS (post.blog.organization_id = ?) — auto-detected
class Comment < LuminaModel
  include BelongsToOrganization
  belongs_to :post
end
```

### 4. Query Builder

Builds the database query using URL parameters:

| Feature | Query Parameter | Example |
|---------|----------------|---------|
| Filtering | `?filter[field]=value` | `?filter[status]=published` |
| Sorting | `?sort=field` | `?sort=-created_at` |
| Searching | `?search=term` | `?search=rails` |
| Pagination | `?page=N&per_page=N` | `?page=2&per_page=25` |
| Includes | `?include=relation` | `?include=user,tags` |
| Fields | `?fields[model]=f1,f2` | `?fields[posts]=id,title` |

Only fields declared in `lumina_filters`, `lumina_sorts`, etc. are accepted. Anything else is silently ignored.

### 5. Response Serialization

Results are serialized into JSON. For `index` endpoints, pagination metadata goes in response headers:

| Header | Description |
|--------|-------------|
| `X-Current-Page` | Current page number |
| `X-Last-Page` | Total number of pages |
| `X-Per-Page` | Items per page |
| `X-Total` | Total number of records |

### 6. Attribute Permissions via Policy

Before sending the response, Lumina checks `permitted_attributes_for_show(user)` and `hidden_attributes_for_show(user)` to determine which columns are visible per user role:

```ruby
class PostPolicy < ResourcePolicy
  def hidden_attributes_for_show(user)
    if user&.has_permission?('posts.*')
      []  # Admin sees everything
    else
      %w[internal_notes cost_price]
    end
  end
end
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

A: Use `lumina_middleware_actions` on your model:

```ruby
class Post < LuminaModel
  lumina_middleware_actions(
    create:  [:verify_email!],
    update:  [:verify_email!],
    destroy: [:require_admin!],
  )
end
```

This applies `verify_email!` middleware only to create and update, and `require_admin!` only to delete.

**Q: Why is my user seeing fields they shouldn't?**

A: Check your policy's `hidden_attributes_for_show(user)` and `permitted_attributes_for_show(user)` methods. These control column-level visibility per user role. If you haven't overridden them, the default allows all fields. Add role-based logic:

```ruby
def hidden_attributes_for_show(user)
  if user&.has_permission?('posts.*')
    []
  else
    %w[secret_field internal_notes]
  end
end
```

**Q: Where does organization scoping happen in the pipeline?**

A: It happens at step 3 (Scope Layer), after middleware and policy checks pass. The scope automatically filters queries by `organization_id` for models using the `BelongsToOrganization` concern.

**Q: How do I debug why a request is returning 403?**

A: The 403 comes from the Policy Layer (step 2). Check:
1. Does the user have the correct permission? (e.g., `posts.create`)
2. Is the permission assigned to their role in the correct organization?
3. For custom policy methods, are you calling `super` to preserve base checks?

---

## Real-World Examples

### Example 1: Restricting API Access with Middleware

```ruby
class Invoice < LuminaModel
  # All invoice routes require authentication
  lumina_middleware :authenticate_user!

  # Only verified users can create invoices
  # Rate limit updates to 30/min
  lumina_middleware_actions(
    create: [:verify_email!],
    update: [:throttle_requests!],
  )
end
```

### Example 2: Role-Based Field Visibility

An HR system where managers see salary info but regular employees don't:

```ruby
class EmployeePolicy < ResourcePolicy
  self.resource_slug = 'employees'

  def permitted_attributes_for_show(user)
    if has_role?(user, 'manager')
      ['*']  # Managers see everything
    else
      %w[id name department title]  # Others see basic info
    end
  end

  def hidden_attributes_for_show(user)
    if has_role?(user, 'manager')
      []
    else
      %w[salary ssn bank_account]
    end
  end
end
```
