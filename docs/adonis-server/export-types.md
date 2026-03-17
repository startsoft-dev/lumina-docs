---
sidebar_position: 14
title: Export Types
---

# Export Types

Lumina includes an Ace command that generates TypeScript interfaces from your registered models. It introspects model column definitions, builds an OpenAPI 3.0 spec internally, and runs `openapi-typescript` to produce a `.d.ts` file.

## Requirements

The command runs `npx openapi-typescript` under the hood, so Node.js must be available on the machine where you run the command (which it is, since you're running AdonisJS).

## Usage

```bash title="terminal"
node ace lumina:export-types
```

This starts the AdonisJS application, introspects all registered models from `config/lumina.ts`, reads their `$columnsDefinitions`, and writes TypeScript interfaces to the configured output paths.

### Command Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--output` | (none) | Explicit output file path. Overrides config/env paths. |

### Examples

```bash title="terminal"
# Write to configured paths (LUMINA_CLIENT_PATH / LUMINA_MOBILE_PATH)
node ace lumina:export-types

# Write to a specific file
node ace lumina:export-types --output=tmp/lumina.d.ts
```

## Configuration

Set the output paths in your `.env` file:

```env title=".env"
LUMINA_CLIENT_PATH=../client
LUMINA_MOBILE_PATH=../mobile
```

Or in `config/lumina.ts`:

```ts title="config/lumina.ts"
import { defineConfig } from '@startsoft/lumina-adonis'

export default defineConfig({
  clientPath: process.env.LUMINA_CLIENT_PATH,
  mobilePath: process.env.LUMINA_MOBILE_PATH,
  // ...
})
```

When both paths are set, the command writes to both:
- `{clientPath}/src/types/lumina.d.ts`
- `{mobilePath}/src/types/lumina.d.ts`

The `--output` flag overrides both and writes to a single explicit path.

## Generated Output

The command generates one interface per model. **All fields are optional** because Lumina's policy system controls which attributes are visible per user/role at runtime.

```typescript title="src/types/lumina.d.ts"
export interface Post {
  id?: number;
  title?: string;
  content?: string;
  is_published?: boolean;
  blog_id?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}
```

### Type Mapping

| Lucid Column Type | TypeScript Type |
|------------------|----------------|
| `integer`, `bigint`, `increments` | `number` |
| `decimal`, `float`, `double` | `number` |
| `boolean` | `boolean` |
| `timestamp`, `datetime`, `date` | `string` |
| `json`, `jsonb` | `Record<string, unknown>` |
| `string`, `text`, `uuid` | `string` |
| Nullable columns | adds `\| null` |

## Using Generated Types

Import the generated types and pass them as generics to Lumina hooks:

```tsx title="src/components/PostsList.tsx"
import type { Post } from '../types/lumina';
import { useModelIndex, useModelStore, useModelUpdate } from '@startsoft/lumina';

// Typed list — data.data is Post[]
const { data } = useModelIndex<Post>('posts', { sort: '-created_at' });

// Typed create — mutate accepts Partial<Post>
const store = useModelStore<Post>('posts');
store.mutate({ title: 'Hello', content: 'World' });

// Typed update — mutate accepts { id, data: Partial<Post> }
const update = useModelUpdate<Post>('posts');
update.mutate({ id: 1, data: { title: 'Updated' } });
```

:::tip Why all fields optional?
Lumina's policy system (`permittedAttributesForShow`, `hiddenAttributesForShow`) dynamically controls which fields appear in API responses based on the authenticated user's role and custom logic. The generated types represent the **union of all possible fields**, not a guarantee of which fields will be present in any given response.
:::

## Workflow

1. Define your models and run migrations
2. Run `node ace lumina:export-types`
3. Import the generated types in your React/React Native code
4. Re-run the command whenever you change your database schema
