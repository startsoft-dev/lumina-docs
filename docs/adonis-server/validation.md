---
sidebar_position: 4
title: Validation
---

# Validation

Lumina provides a two-layer validation system through the `HasValidation` mixin:

1. **VineJS schemas** (`$validationSchema`) — type and format validation using AdonisJS's native [VineJS](https://vinejs.dev/) library
2. **Store/update rules** (`$validationRulesStore` / `$validationRulesUpdate`) — role-based field allowlisting with presence modifiers

## HasValidation Mixin

Apply the mixin to your model using `compose()`, or extend `LuminaModel` (which includes it automatically):

```ts
import vine from '@vinejs/vine'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'

export default class Post extends LuminaModel {
  static $validationSchema = {
    title: vine.string().maxLength(255),
    content: vine.string(),
    status: vine.enum(['draft', 'published', 'archived']),
  }

  static $validationRulesStore = ['title', 'content']
  static $validationRulesUpdate = ['title', 'content', 'status']
}
```

The mixin adds these static methods to your model:

| Method | Description |
|---|---|
| `validateStore(data, roleSlug?)` | Validate data for a create operation. Returns `Promise<{ valid, data, errors }>`. |
| `validateUpdate(data, roleSlug?)` | Validate data for an update operation. Returns `Promise<{ valid, data, errors }>`. |
| `permittedFieldsFor(action, roleSlug?)` | Returns the list of permitted field names for a given action and role. |

## VineJS Schema (`$validationSchema`)

Define per-field type constraints using VineJS schema builders. **Do not** add `.optional()` or `.nullable()` — presence is controlled by store/update rules.

```ts
import vine from '@vinejs/vine'

static $validationSchema = {
  title: vine.string().maxLength(255),
  content: vine.string(),
  status: vine.enum(['draft', 'published', 'archived']),
  email: vine.string().email(),
  score: vine.number().min(0).max(100),
  is_active: vine.boolean(),
  starts_at: vine.date(),
}
```

VineJS provides full TypeScript type inference, async validation support, and robust built-in rules. See the [VineJS documentation](https://vinejs.dev/docs/introduction) for all available schema types and rules.

## Store and Update Rules

The `$validationRulesStore` and `$validationRulesUpdate` properties control which fields are accepted for each operation. They act as an **allowlist** — fields not listed for the user's role are silently ignored.

### Flat Array Format

The simplest approach. List the field names to permit (all treated as `required`):

```ts
static $validationSchema = {
  title: vine.string().maxLength(255),
  content: vine.string(),
  status: vine.enum(['draft', 'published', 'archived']),
}

// Only accept title and content when creating
static $validationRulesStore = ['title', 'content']

// Accept title, content, and status when updating
static $validationRulesUpdate = ['title', 'content', 'status']
```

### Role-Keyed Object Format

For role-based validation, use an object where keys are role slugs and values map fields to presence modifiers:

```ts
static $validationRulesStore = {
  admin: {
    title: 'required',
    status: 'nullable',
    internal_notes: 'nullable',
  },
  editor: {
    title: 'required',
    content: 'required',
  },
  '*': {
    title: 'required',
  },
}
```

The `'*'` key is the fallback used when the user's role does not match any specific key.

## Presence Modifiers

Each field in a role's rules maps to a presence modifier:

| Modifier | Behavior |
|---|---|
| `required` | Field must be present and non-empty. Returns an error if missing, null, or empty string. |
| `nullable` | Field is included in output. If not present in input, defaults to `null`. |
| `sometimes` | Field is only included if present in input. If absent, it is skipped entirely (not set to null). |

## How Validation Works

When `validateStore()` or `validateUpdate()` is called, Lumina follows this process:

1. **Resolve permitted fields** — find the matching role key (or `'*'` fallback) to determine which fields are allowed and their presence modifiers
2. **Filter input** — strip any fields not in the permitted list
3. **Check presence** — enforce `required`, `nullable`, and `sometimes` rules
4. **Run VineJS validation** — for non-null values that have a `$validationSchema` entry, build a dynamic `vine.object()` and validate type/format constraints
5. **Return result** — `{ valid: true, data }` or `{ valid: false, errors }`

:::info No config passthrough
If no store/update rules are defined (empty object `{}`), all input data passes through unchanged. This is useful for models that don't need field allowlisting.
:::

## Validation Response

When validation fails, the controller returns a `422 Unprocessable Entity` response:

```json
{
  "errors": {
    "title": ["The title field is required."],
    "status": ["The value of status field must be one of draft, published, archived"]
  }
}
```

Each field key maps to an array of error messages. Presence errors use Lumina's own messages; type/format errors use VineJS's default messages.

## Complete Example

```ts
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

  // -- Store: only title and body are required --
  static $validationRulesStore = {
    '*': { title: 'required', body: 'required' },
  }

  // -- Update: role-based overrides --
  static $validationRulesUpdate = {
    admin: {
      title: 'sometimes',
      body: 'sometimes',
      status: 'nullable',
      priority: 'nullable',
    },
    '*': {
      title: 'sometimes',
      body: 'sometimes',
      status: 'sometimes',
    },
  }
}
```

In this example:

- **Creating** an article requires `title` and `body`. Other fields are silently ignored.
- **Updating** as an `admin` allows all four fields optionally, with `status` and `priority` accepting null.
- **Updating** as any other role allows `title`, `body`, and `status` optionally.
- VineJS enforces that `title` is max 255 chars, `status` is one of the allowed values, `priority` is between 1-10, and `author_email` is a valid email — regardless of role.
