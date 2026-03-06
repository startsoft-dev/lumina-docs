# Lumina AdonisJS Server — Validation (Skill)

You are a senior software engineer specialized in **Lumina**, an AdonisJS package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **AdonisJS (TypeScript)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's two-layer validation system for AdonisJS: VineJS schemas (`$validationSchema`) for type and format validation, policy-driven field permissions (`permittedAttributesForCreate`, `permittedAttributesForUpdate`) for controlling which fields each user can submit, the validation flow (permitted fields check then VineJS validation), role-based conditional validation, forbidden field responses (403), validation error responses (422), and how the policy and model work together.

---

## Documentation

### How Validation Works

Lumina provides a two-layer validation system:

1. **Policy-driven field permissions** -- the policy determines which fields each user is allowed to submit for create and update actions
2. **VineJS schemas** (`$validationSchema`) -- type and format validation using AdonisJS's native VineJS library

When a store or update request is received, Lumina follows this process:

1. **Resolve permitted fields** -- calls `permittedAttributesForCreate(user)` or `permittedAttributesForUpdate(user)` on the policy to determine which fields the user is allowed to submit
2. **Check for forbidden fields** -- if the request contains fields not in the permitted list, returns **403 Forbidden** with a message listing the forbidden fields
3. **Run VineJS validation** -- for non-null values that have a `$validationSchema` entry, validates type/format constraints
4. **Return result** -- `{ valid: true, data }` or `{ valid: false, errors }`

### VineJS Schema ($validationSchema)

Define per-field type constraints using VineJS schema builders on your model:

```ts
import vine from '@vinejs/vine'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'

export default class Post extends LuminaModel {
  static $validationSchema = {
    title: vine.string().maxLength(255),
    content: vine.string(),
    status: vine.enum(['draft', 'published', 'archived']),
    email: vine.string().email(),
    score: vine.number().min(0).max(100),
    is_active: vine.boolean(),
    starts_at: vine.date(),
  }
}
```

VineJS provides full TypeScript type inference, async validation support, and robust built-in rules. Common VineJS schema types include:

| VineJS Type | Example | Description |
|---|---|---|
| `vine.string()` | `vine.string().maxLength(255)` | String with optional constraints |
| `vine.number()` | `vine.number().min(0).max(100)` | Number with min/max |
| `vine.boolean()` | `vine.boolean()` | Boolean value |
| `vine.enum()` | `vine.enum(['a', 'b', 'c'])` | Must be one of the listed values |
| `vine.date()` | `vine.date()` | Valid date |
| `vine.string().email()` | `vine.string().email()` | Valid email address |
| `vine.string().url()` | `vine.string().url()` | Valid URL |

**Important:** Do not add `.optional()` or `.nullable()` to VineJS schemas -- presence is controlled by the policy's permitted fields. Only fields present in the request and in the permitted list are validated.

### Policy-Driven Field Permissions

Field permissions are defined on the **policy**, not the model. The policy determines which fields each user is allowed to submit:

```ts
// app/policies/post_policy.ts
import { ResourcePolicy } from '@startsoft/lumina-adonis/policies/resource_policy'

export default class PostPolicy extends ResourcePolicy {
  static resourceSlug = 'posts'

  permittedAttributesForCreate(user: any | null): string[] {
    if (!user) return []
    return this.hasRole(user, 'admin') ? ['*'] : ['title', 'content']
  }

  permittedAttributesForUpdate(user: any | null): string[] {
    if (!user) return []
    if (this.hasRole(user, 'admin')) return ['*']
    return ['title', 'content']
  }
}
```

### Default Behavior

By default, all `ResourcePolicy` attribute permission methods return `['*']` (all fields permitted). Override them in your policy subclass to restrict access.

### Forbidden Fields Response (403)

If the user submits a field that is **not** in their permitted list, the controller returns a **403 Forbidden** response:

```json
{
  "message": "Forbidden: you are not allowed to set the following fields: status, priority"
}
```

This is different from validation errors (422) -- forbidden fields mean the user does not have permission, while validation errors mean the data format is wrong.

### Validation Error Response (422)

When VineJS format validation fails, the controller returns a `422 Unprocessable Entity` response:

```json
{
  "errors": {
    "title": ["The title field must have a maximum length of 255"],
    "status": ["The value of status field must be one of draft, published, archived"]
  }
}
```

Each field key maps to an array of error messages from VineJS.

### Complete Validation Example

```ts
// app/models/article.ts
import { DateTime } from 'luxon'
import { column } from '@adonisjs/lucid/orm'
import vine from '@vinejs/vine'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'

export default class Article extends LuminaModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column()
  declare body: string

  @column()
  declare status: string

  @column()
  declare priority: number

  @column()
  declare authorEmail: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // -- Type/format schemas (VineJS) --
  static $validationSchema = {
    title: vine.string().maxLength(255),
    body: vine.string(),
    status: vine.enum(['draft', 'review', 'published']),
    priority: vine.number().min(1).max(10),
    author_email: vine.string().email(),
  }
}
```

```ts
// app/policies/article_policy.ts
import { ResourcePolicy } from '@startsoft/lumina-adonis/policies/resource_policy'

export default class ArticlePolicy extends ResourcePolicy {
  static resourceSlug = 'articles'

  permittedAttributesForCreate(user: any | null): string[] {
    if (!user) return []
    return this.hasRole(user, 'admin')
      ? ['title', 'body', 'status', 'priority', 'author_email']
      : ['title', 'body']
  }

  permittedAttributesForUpdate(user: any | null): string[] {
    if (!user) return []
    if (this.hasRole(user, 'admin')) return ['*']
    return ['title', 'body', 'status']
  }
}
```

In this example:

- **Creating** as an admin allows all five fields. Other users can only submit `title` and `body`. Submitting `status` as a non-admin returns 403.
- **Updating** as an admin allows all fields. Other users can update `title`, `body`, and `status`.
- VineJS enforces that `title` is max 255 chars, `status` is one of the allowed values, `priority` is between 1-10, and `author_email` is a valid email -- regardless of role.

---

## Frequently Asked Questions

**Q: Where do I define validation rules -- on the model or the policy?**

A: Both, but they serve different purposes:

- **Model (`$validationSchema`)** -- Defines type and format constraints using VineJS (e.g., max length, email format, enum values). These rules apply to all users regardless of role.
- **Policy (`permittedAttributesForCreate/Update`)** -- Controls which fields each user is allowed to submit. This is role-based access control for fields.

```ts
// Model: format rules (applies to everyone)
static $validationSchema = {
  title: vine.string().maxLength(255),
  status: vine.enum(['draft', 'published']),
}

// Policy: field permissions (role-based)
permittedAttributesForCreate(user: any | null): string[] {
  return this.hasRole(user, 'admin') ? ['*'] : ['title']
}
```

**Q: Should I add `.optional()` or `.nullable()` to my VineJS schema?**

A: No. Do not add `.optional()` or `.nullable()` to VineJS schemas. Field presence is controlled by the policy's permitted fields. Only fields that are both present in the request and in the permitted list are validated against the schema.

**Q: What is the difference between a 403 and a 422 error?**

A: A **403 Forbidden** means the user submitted fields they are not allowed to set (controlled by the policy). A **422 Unprocessable Entity** means the data failed format validation (controlled by VineJS). The 403 check happens first -- if the fields are not permitted, Lumina never reaches the VineJS validation step.

**Q: How do I allow admins to set all fields but restrict regular users?**

A: Return `['*']` for admins and a specific list for other roles:

```ts
permittedAttributesForCreate(user: any | null): string[] {
  if (!user) return []
  return this.hasRole(user, 'admin') ? ['*'] : ['title', 'content']
}
```

**Q: How do I validate that a field is a valid email?**

A: Use VineJS's email rule in the `$validationSchema`:

```ts
static $validationSchema = {
  email: vine.string().email(),
  website: vine.string().url(),
}
```

**Q: What happens if a field is submitted but has no validation schema entry?**

A: If a field is in the permitted list but does not have a `$validationSchema` entry, it is accepted without format validation. Only fields with schema entries are format-validated. This is useful for fields like foreign keys where you trust the policy to control access.

**Q: Can I use the same validation rules for both create and update?**

A: The `$validationSchema` applies the same format rules for both create and update. The difference is in which fields are permitted -- the policy can return different field lists for `permittedAttributesForCreate` and `permittedAttributesForUpdate`.

---

## Real-World Examples

### Example 1: Blog Post with Role-Based Field Permissions

```ts
// app/models/post.ts
import { DateTime } from 'luxon'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import vine from '@vinejs/vine'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import User from '#models/user'

export default class Post extends LuminaModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column()
  declare content: string

  @column()
  declare status: string

  @column()
  declare featured: boolean

  @column()
  declare publishedAt: string

  @column()
  declare userId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static $validationSchema = {
    title: vine.string().maxLength(255),
    content: vine.string(),
    status: vine.enum(['draft', 'published', 'archived']),
    featured: vine.boolean(),
    published_at: vine.date(),
  }

  static $policy = () => import('#policies/post_policy')

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
```

```ts
// app/policies/post_policy.ts
import { ResourcePolicy } from '@startsoft/lumina-adonis/policies/resource_policy'

export default class PostPolicy extends ResourcePolicy {
  static resourceSlug = 'posts'

  permittedAttributesForCreate(user: any | null): string[] {
    if (!user) return []
    if (this.hasRole(user, 'admin')) {
      return ['title', 'content', 'status', 'featured', 'published_at']
    }
    // Regular authors can only set title and content
    return ['title', 'content']
  }

  permittedAttributesForUpdate(user: any | null): string[] {
    if (!user) return []
    if (this.hasRole(user, 'admin')) return ['*']
    // Authors can update their own content and submit for review
    return ['title', 'content', 'status']
  }
}
```

With this setup:
- An admin creating a post can set `title`, `content`, `status`, `featured`, and `published_at`
- A regular author creating a post can only set `title` and `content`. If they try to set `status`, they get a 403.
- VineJS ensures `title` never exceeds 255 characters and `status` is always one of the valid enum values.

### Example 2: User Registration with Strict Validation

```ts
// app/models/user.ts
import { column } from '@adonisjs/lucid/orm'
import vine from '@vinejs/vine'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'

export default class User extends LuminaModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare phone: string

  @column()
  declare role: string

  static $validationSchema = {
    name: vine.string().maxLength(255),
    email: vine.string().email().maxLength(255),
    password: vine.string().minLength(8),
    phone: vine.string().maxLength(20),
    role: vine.enum(['user', 'editor', 'admin']),
  }

  static $policy = () => import('#policies/user_policy')
}
```

```ts
// app/policies/user_policy.ts
import { ResourcePolicy } from '@startsoft/lumina-adonis/policies/resource_policy'

export default class UserPolicy extends ResourcePolicy {
  static resourceSlug = 'users'

  permittedAttributesForCreate(user: any | null): string[] {
    if (!user) return []
    // Only admins can create users, and they can set the role
    if (this.hasRole(user, 'admin')) {
      return ['name', 'email', 'password', 'phone', 'role']
    }
    return []
  }

  permittedAttributesForUpdate(user: any | null): string[] {
    if (!user) return []
    if (this.hasRole(user, 'admin')) return ['*']
    // Users can only update their own name and phone
    return ['name', 'phone']
  }

  hiddenAttributesForShow(user: any | null): string[] {
    if (!user) return ['email', 'phone']
    if (this.hasRole(user, 'admin')) return []
    return ['phone']
  }
}
```

### Example 3: Product with Numeric Constraints

```ts
// app/models/product.ts
import { column } from '@adonisjs/lucid/orm'
import vine from '@vinejs/vine'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'

export default class Product extends LuminaModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string

  @column()
  declare price: number

  @column()
  declare quantity: number

  @column()
  declare sku: string

  @column()
  declare status: string

  static $validationSchema = {
    name: vine.string().maxLength(255),
    description: vine.string(),
    price: vine.number().min(0),
    quantity: vine.number().min(0),
    sku: vine.string().maxLength(50),
    status: vine.enum(['draft', 'active', 'discontinued']),
  }

  static $policy = () => import('#policies/product_policy')
}
```

```ts
// app/policies/product_policy.ts
import { ResourcePolicy } from '@startsoft/lumina-adonis/policies/resource_policy'

export default class ProductPolicy extends ResourcePolicy {
  static resourceSlug = 'products'

  permittedAttributesForCreate(user: any | null): string[] {
    if (!user) return []
    return ['name', 'description', 'price', 'quantity', 'sku', 'status']
  }

  permittedAttributesForUpdate(user: any | null): string[] {
    if (!user) return []
    if (this.hasRole(user, 'admin')) return ['*']
    // Editors can update name, description, and status but not price/quantity
    return ['name', 'description', 'status']
  }
}
```

With this setup, editors cannot change the price or stock quantity -- only admins can. VineJS ensures `price` and `quantity` are never negative, regardless of who submits them.
