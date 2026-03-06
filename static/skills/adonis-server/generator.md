# Lumina AdonisJS Server — Generator (Skill)

You are a senior software engineer specialized in **Lumina**, an AdonisJS package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **AdonisJS (TypeScript)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's interactive generator command: `node ace lumina:generate` (alias `lumina:g`), generating models (with migrations), policies, and scopes, interactive prompts for column definitions and types, auto-registration in `config/lumina.ts`, the organization ownership step for multi-tenant apps, and additional options like soft deletes, policy generation, and audit trail.

---

## Documentation

### Usage

Run the interactive generator:

```bash
node ace lumina:generate
```

Or use the shorthand alias:

```bash
node ace lumina:g
```

The command launches an interactive prompt that walks you through the entire scaffolding process.

### What It Generates

The generator can create three types of resources:

#### Model (with Migration)

Generates a complete Lumina-ready model file and its corresponding database migration. The model includes:
- `$allowedFilters`, `$allowedSorts`, `$defaultSort`, `$allowedIncludes`, `$allowedFields`, `$allowedSearch`
- `$validationSchema` (VineJS type/format schemas)
- Lucid `@column()` decorators with proper TypeScript types
- Relationship declarations for foreign key columns
- Soft delete support (optional)
- Automatic registration in `config/lumina.ts`

**Generated files:**
- `app/models/{model_name}.ts` -- The Lucid model
- `database/migrations/{timestamp}_create_{table}_table.ts` -- The migration
- `config/lumina.ts` -- Updated with the new model registration

#### Policy

Generates a policy class that extends `ResourcePolicy`:

```ts
import { ResourcePolicy } from '@startsoft/lumina-adonis/policies/resource_policy'

export default class PostPolicy extends ResourcePolicy {
  static resourceSlug = 'posts'

  // All CRUD methods inherited from ResourcePolicy.
  // Override for custom authorization logic.
}
```

**Generated file:** `app/policies/{model_name}_policy.ts`

#### Scope

Generates a global query scope class for use with the `HasAutoScope` mixin:

```ts
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

export default class PostScope {
  static apply(query: ModelQueryBuilderContract<any>) {
    // Add your global scope logic here
    // e.g., query.where('is_visible', true)
    return query
  }
}
```

**Generated file:** `app/models/scopes/{model_name}_scope.ts`

### Interactive Walkthrough

#### Step 1: Choose Resource Type

```
What type of resource would you like to generate?
> Model (with migration)
  Policy (extends ResourcePolicy)
  Scope (global query scope)
```

#### Step 2: Enter Resource Name

```
What is the resource name?
> Post
```

Use PascalCase singular (e.g., `Post`, not `posts`). The generator derives the table name, file name, and slug automatically.

#### Step 3: Organization Ownership (Multi-Tenant Only)

If multi-tenancy is enabled in your config, you are asked:

```
Does this model belong to an organization? (Y/n)
```

Organization ownership is auto-detected from `belongsTo` relationships at runtime.

#### Step 4: Define Columns

```
Would you like to define columns interactively? (Y/n)
```

For each column, you specify:

| Prompt | Description |
|--------|-------------|
| Column name | Snake_case name (e.g., `title`, `user_id`, `is_published`) |
| Column type | One of: `string`, `text`, `integer`, `boolean`, `date`, `datetime`, `decimal`, `uuid`, `references` |
| Foreign model | For `references` type only -- which model does this column reference |
| Nullable? | Whether the column allows null values |
| Unique? | Whether the column has a unique constraint |
| Has index? | Whether to add a database index |
| Default value | Optional default value |

### Column Types

The generator supports the following column types:

| Type | Database Column | TypeScript Type | VineJS Schema |
|------|----------------|-----------------|---------------|
| `string` | `VARCHAR(255)` | `string` | `vine.string().maxLength(255)` |
| `text` | `TEXT` | `string` | `vine.string()` |
| `integer` | `INTEGER` | `number` | `vine.number()` |
| `boolean` | `BOOLEAN` | `boolean` | `vine.boolean()` |
| `date` | `DATE` | `DateTime` | `vine.date()` |
| `datetime` | `TIMESTAMP` | `DateTime` | `vine.date()` |
| `decimal` | `DECIMAL(10,2)` | `number` | `vine.number()` |
| `uuid` | `UUID` | `string` | `vine.string()` |
| `references` | `INTEGER` (FK) | `number` | `vine.number()` |

For `references` columns, the generator automatically:
- Creates a foreign key constraint in the migration
- Generates a `@belongsTo` relationship on the model
- Adds the related model name to `$allowedIncludes`

#### Step 5: Additional Options

```
Additional options
> [ ] Add soft deletes
  [ ] Generate policy
  [ ] Add audit trail
```

- **Soft deletes** -- adds `static $softDeletes = true` and a `deleted_at` column
- **Generate policy** -- creates a policy file alongside the model
- **Audit trail** -- adds the `HasAuditTrail` mixin

### Auto-Registration

When generating a model, the command automatically registers it in `config/lumina.ts` by inserting a new entry into the `models` map:

```ts
models: {
  // existing models...
  posts: () => import('#models/post'),  // <-- added by generator
},
```

If the model slug already exists in the config, the registration step is skipped.

### Generated Model Example

For a `BlogPost` model with `title` (string), `content` (text), and `user` (references User) columns, soft deletes, and organization ownership, the generator produces:

```ts
import { DateTime } from 'luxon'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { compose } from '@adonisjs/core/helpers'
import vine from '@vinejs/vine'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import { BelongsToOrganization } from '@startsoft/lumina-adonis/mixins/belongs_to_organization'
import User from '#models/user'

export default class BlogPost extends compose(LuminaModel, BelongsToOrganization) {
  static table = 'blog_posts'

  static $softDeletes = true
  static $allowedFilters = ['title', 'user_id']
  static $allowedSorts = ['title', 'user_id', 'created_at']
  static $defaultSort = '-created_at'
  static $allowedIncludes = ['user']
  static $allowedFields = ['id', 'title', 'content', 'user_id', 'created_at']
  static $allowedSearch = ['title', 'content']

  static $validationSchema = {
    title: vine.string().maxLength(255),
    content: vine.string(),
    user_id: vine.number(),
  }

  // Field permissions are controlled by the policy.

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column()
  declare content: string

  @column()
  declare userId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare deletedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
```

### Next Steps After Generation

The generator prints a summary with next steps:

```
Post model generated successfully!

Created files:
  Model       app/models/post.ts
  Migration   database/migrations/..._create_posts_table.ts
  Config      config/lumina.ts (registered as 'posts')
  Policy      app/policies/post_policy.ts

Next steps:
  1. Run migrations: node ace migration:run
  2. Review the generated model at: app/models/post.ts
  3. Your API endpoints: GET/POST /api/posts, GET/PUT/DELETE /api/posts/:id
```

---

## Frequently Asked Questions

**Q: What is the shorthand for the generator command?**

A: Use `node ace lumina:g` instead of `node ace lumina:generate`.

**Q: What naming convention should I use for the resource name?**

A: Use PascalCase singular (e.g., `Post`, `BlogPost`, `OrderItem`). The generator derives the table name (`posts`, `blog_posts`, `order_items`), file name (`post.ts`, `blog_post.ts`), and model slug automatically.

**Q: How does the generator handle foreign key columns?**

A: When you select the `references` column type, the generator asks which model the column references. It then automatically:
- Creates a foreign key constraint in the migration
- Generates a `@belongsTo` relationship declaration on the model
- Adds the related model name to `$allowedIncludes`

```ts
// Generated for a 'user_id' references column
@column()
declare userId: number

@belongsTo(() => User)
declare user: BelongsTo<typeof User>
```

**Q: Can I generate just a policy without a model?**

A: Yes. Select "Policy (extends ResourcePolicy)" in the resource type prompt:

```bash
$ node ace lumina:g
? What type of resource would you like to generate? Policy (extends ResourcePolicy)
? What is the resource name? Post

CREATE app/policies/post_policy.ts
```

**Q: What happens if the model is already registered in config/lumina.ts?**

A: The auto-registration step is skipped. The generator checks for existing model slugs before modifying the config file.

**Q: How do I generate a model with organization ownership?**

A: When multi-tenancy is enabled, the generator asks "Does this model belong to an organization?". Answering yes adds the `BelongsToOrganization` mixin and an `organizationId` column. For indirect ownership, Lumina auto-detects the path via `belongsTo` relationships at runtime.

**Q: Can I add audit trail support during generation?**

A: Yes. In the "Additional options" step, select "Add audit trail". This adds the `HasAuditTrail` mixin to the generated model:

```ts
import { HasAuditTrail } from '@startsoft/lumina-adonis/mixins/has_audit_trail'

export default class Post extends compose(LuminaModel, HasAuditTrail) {
  // ...
}
```

---

## Real-World Examples

### Generating a Blog Post Model with All Options

```bash
$ node ace lumina:generate

? What type of resource would you like to generate? Model (with migration)
? What is the resource name? BlogPost
? Does this model belong to an organization? Yes
? Would you like to define columns interactively? Yes

? Column name: title
? Column type for 'title': string (VARCHAR 255)
? Is 'title' nullable? No
? Should 'title' be unique? No
? Should 'title' have an index? No
? Default value for 'title'?

? Add another column? Yes

? Column name: content
? Column type for 'content': text (TEXT)
? Is 'content' nullable? No
...

? Column name: user_id
? Column type for 'user_id': references
? Which model does 'user_id' reference? User
? Is 'user_id' nullable? No
...

? Additional options: Add soft deletes, Generate policy, Add audit trail

CREATE app/models/blog_post.ts
CREATE database/migrations/2026_03_06_120000_create_blog_posts_table.ts
UPDATE config/lumina.ts
CREATE app/policies/blog_post_policy.ts
```

### Generating a Scope for Visibility Filtering

```bash
$ node ace lumina:g

? What type of resource would you like to generate? Scope (global query scope)
? What is the resource name? Post

CREATE app/models/scopes/post_scope.ts
```

Then customize the generated scope:

```ts
// app/models/scopes/post_scope.ts
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

export default class PostScope {
  static apply(query: ModelQueryBuilderContract<any>) {
    query.where('is_visible', true)
    return query
  }
}
```

### Generating a Nested Model with Indirect Organization Ownership

```bash
$ node ace lumina:g

? What type of resource would you like to generate? Model (with migration)
? What is the resource name? Comment
? Does this model belong to an organization? No

CREATE app/models/comment.ts
CREATE database/migrations/2026_03_06_120100_create_comments_table.ts
UPDATE config/lumina.ts
```

The generated model has a `belongsTo` relationship -- Lumina auto-detects the organization path at runtime (Comment -> post -> organization):

```ts
export default class Comment extends compose(LuminaModel, BelongsToOrganization) {
  @column()
  declare postId: number

  @belongsTo(() => Post)
  declare post: BelongsTo<typeof Post>
}
```


