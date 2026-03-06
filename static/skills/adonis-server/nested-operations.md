# Lumina AdonisJS Server — Nested Operations (Skill)

You are a senior software engineer specialized in **Lumina**, an AdonisJS package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **AdonisJS (TypeScript)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's nested operations endpoint: executing multiple create and update operations in a single atomic database transaction, the request/response format, validation and authorization per operation, organization scoping in multi-tenant mode, and configuration options (path, maxOperations, allowedModels).

---

## Documentation

### Endpoint

```bash
POST /api/nested                       # Without multi-tenancy
POST /api/:organization/nested         # With multi-tenancy (URL prefix mode)
```

The path is configurable in `config/lumina.ts`:

```ts
nested: {
  path: 'nested',  // or 'batch' or 'bulk'
},
```

When multi-tenancy is enabled, the nested operations endpoint is registered under the `tenant` route group automatically.

### Configuration

Configure nested operations in `config/lumina.ts`:

```ts
import { defineConfig } from '@startsoft/lumina-adonis'

export default defineConfig({
  nested: {
    path: 'nested',         // Route path (default: 'nested')
    maxOperations: 50,      // Maximum operations per request (default: 50)
    allowedModels: null,    // null = all registered models
  },
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | `string` | `'nested'` | The URL path segment for the nested endpoint |
| `maxOperations` | `number` | `50` | Maximum number of operations allowed in a single request. Requests exceeding this return a `422` error |
| `allowedModels` | `string[] \| null` | `null` | When `null`, all registered models can be used. When an array, only the listed model slugs are permitted |

### Request Body Format

The request body must contain an `operations` array. Each operation specifies the model, the action (`create` or `update`), and the data:

```json
{
  "operations": [
    {
      "model": "posts",
      "action": "create",
      "data": {
        "title": "New Post",
        "content": "Post content here"
      }
    },
    {
      "model": "posts",
      "action": "update",
      "id": 5,
      "data": {
        "title": "Updated Title"
      }
    },
    {
      "model": "comments",
      "action": "create",
      "data": {
        "post_id": 5,
        "body": "A new comment"
      }
    }
  ]
}
```

### Operation Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | `string` | Yes | The model slug (must match a key in `config/lumina.ts` models) |
| `action` | `string` | Yes | Either `'create'` or `'update'` |
| `id` | `number \| string` | For updates | The ID of the record to update |
| `data` | `object` | Yes | The data payload for the operation |

### Response Format

On success, the endpoint returns a `results` array with the outcome of each operation:

```json
{
  "results": [
    {
      "model": "posts",
      "id": 42,
      "action": "created",
      "data": { "id": 42, "title": "New Post", "content": "Post content here" }
    },
    {
      "model": "posts",
      "id": 5,
      "action": "updated",
      "data": { "id": 5, "title": "Updated Title", "content": "..." }
    },
    {
      "model": "comments",
      "id": 18,
      "action": "created",
      "data": { "id": 18, "post_id": 5, "body": "A new comment" }
    }
  ]
}
```

Each result includes:
- `model` -- the model slug
- `id` -- the record's primary key (assigned after creation or confirmed after update)
- `action` -- either `'created'` or `'updated'`
- `data` -- the full serialized record

### Transaction Wrapping

All operations in a single request are executed inside a database transaction. If any operation fails (validation error, authorization denial, database constraint violation), the entire transaction is rolled back and no changes are persisted.

This guarantees atomicity: either all operations succeed, or none of them do.

### Validation

Each operation is individually validated. The controller resolves permitted fields from the policy (`permittedAttributesForCreate` or `permittedAttributesForUpdate`) and then runs VineJS format validation via `validateForAction()`:

- Forbidden fields (not in the permitted list) return **403 Forbidden**
- Format validation failures return **422 Unprocessable Entity**

Validation errors are prefixed with the operation index for clarity:

```json
{
  "message": "Validation failed.",
  "errors": {
    "operations.0.data.title": ["The title field is required."],
    "operations.2.data.body": ["The body field must be a string."]
  }
}
```

All operations are validated **before** any database writes begin. If any operation fails validation, the entire request is rejected.

### Authorization

Each operation is individually authorized:

- Create operations check the `create` policy method
- Update operations load the record (with organization scoping) and check the `update` policy method

Authorization is checked **after** validation but **before** the database transaction begins.

### Organization Scoping

When multi-tenancy is enabled:
- Create operations automatically receive the `organization_id` from the current context
- Update operations are scoped to the current organization (the record must belong to the org)

### Restricting Allowed Models

To limit which models can be used in nested operations:

```ts
nested: {
  allowedModels: ['posts', 'comments', 'tags'],
},
```

Operations targeting unlisted models return a `422` error:

```json
{
  "message": "Operation not allowed.",
  "errors": {
    "operations.0.model": ["Model \"users\" is not allowed for nested operations."]
  }
}
```

### Error Handling

The endpoint validates at multiple levels and returns appropriate errors:

| Check | Status | When |
|-------|--------|------|
| Missing `operations` array | `422` | Request body does not contain a valid `operations` array |
| Invalid operation structure | `422` | An operation is missing required fields (`model`, `action`, `data`) |
| Invalid action value | `422` | Action is not `'create'` or `'update'` |
| Missing `id` for update | `422` | Update operation does not include an `id` |
| Exceeds `maxOperations` | `422` | Too many operations in a single request |
| Disallowed model | `422` | Model is not in `allowedModels` list |
| Unknown model | `422` | Model slug does not exist in `config/lumina.ts` |
| Validation failure | `422` | Operation data does not pass model validation |
| Authorization failure | `403` | User lacks permission for the operation |
| Record not found (update) | `404` | The `id` does not match an existing record in scope |

---

## Frequently Asked Questions

**Q: How do I create related records in a single request?**

A: Use nested operations to create parent and child records together. Note that unlike the Laravel version, the AdonisJS nested operations do not support `$N.field` cross-references. Create the parent first if you need its ID:

```json
{
  "operations": [
    {
      "model": "posts",
      "action": "create",
      "data": { "title": "New Post", "content": "Content here" }
    },
    {
      "model": "tags",
      "action": "create",
      "data": { "name": "AdonisJS", "slug": "adonisjs" }
    }
  ]
}
```

**Q: What happens if one operation fails?**

A: Everything is rolled back. If operation 2 of 5 fails validation, none of the operations are persisted. It is all-or-nothing -- no partial results.

**Q: Is each operation authorized separately?**

A: Yes. Each operation checks the model's policy independently. If the user can create posts but not comments, the entire batch fails with 403.

**Q: What is the maximum number of operations per request?**

A: Default is 50. Configure it in `config/lumina.ts`:

```ts
nested: {
  maxOperations: 100,
},
```

**Q: Can I mix create and update operations in the same batch?**

A: Yes. Mix and match as needed:

```json
{
  "operations": [
    { "action": "create", "model": "posts", "data": { "title": "New Post" } },
    { "action": "update", "model": "posts", "id": 5, "data": { "title": "Updated Title" } }
  ]
}
```

**Q: How does organization scoping work with nested operations?**

A: When multi-tenancy is enabled, create operations automatically receive the `organization_id` from the request context. Update operations are scoped to the current organization, so you can only update records that belong to the resolved org.

**Q: Can I restrict which models are allowed in nested operations?**

A: Yes. Set the `allowedModels` config option:

```ts
nested: {
  allowedModels: ['posts', 'comments'],
},
```

Any operation targeting a model not in this list returns a `422` error.

---

## Real-World Examples

### E-Commerce: Create Order with Items

```json
{
  "operations": [
    {
      "model": "orders",
      "action": "create",
      "data": {
        "customer_name": "John Doe",
        "shipping_address": "123 Main St",
        "status": "pending"
      }
    },
    {
      "model": "order-items",
      "action": "create",
      "data": {
        "product_id": 42,
        "quantity": 2,
        "unit_price": 29.99
      }
    },
    {
      "model": "order-items",
      "action": "create",
      "data": {
        "product_id": 15,
        "quantity": 1,
        "unit_price": 49.99
      }
    }
  ]
}
```

### CMS: Create Page with Sections

```json
{
  "operations": [
    {
      "model": "pages",
      "action": "create",
      "data": { "title": "About Us", "slug": "about-us" }
    },
    {
      "model": "sections",
      "action": "create",
      "data": {
        "title": "Our Mission",
        "content": "We build great software.",
        "order": 1
      }
    },
    {
      "model": "sections",
      "action": "create",
      "data": {
        "title": "Our Team",
        "content": "Meet the people behind it all.",
        "order": 2
      }
    }
  ]
}
```

### Bulk Update Posts with Status Change

```json
{
  "operations": [
    { "action": "update", "model": "posts", "id": 1, "data": { "status": "archived" } },
    { "action": "update", "model": "posts", "id": 2, "data": { "status": "archived" } },
    { "action": "update", "model": "posts", "id": 3, "data": { "status": "archived" } },
    { "action": "create", "model": "notifications", "data": { "message": "3 posts archived", "type": "info" } }
  ]
}
```
