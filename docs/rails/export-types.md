---
sidebar_position: 14
title: Export Types
---

# Export Types

Lumina includes a Rails command that generates TypeScript interfaces from your registered models. It introspects the database schema, builds an OpenAPI 3.0 spec internally, and runs `openapi-typescript` to produce a `.d.ts` file.

## Requirements

The command runs `npx openapi-typescript` under the hood, so Node.js must be available on the machine where you run the command.

## Usage

```bash title="terminal"
rails lumina:export_types
```

This introspects all registered models from `Lumina.config.models`, reads their database columns via `columns_hash`, and writes TypeScript interfaces to the configured output paths.

### Command Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--output` | (none) | Explicit output file path. Overrides config/env paths. |

### Examples

```bash title="terminal"
# Write to configured paths (LUMINA_CLIENT_PATH / LUMINA_MOBILE_PATH)
rails lumina:export_types

# Write to a specific file
rails lumina:export_types --output=tmp/lumina.d.ts
```

## Configuration

Set the output paths via environment variables:

```env title=".env"
LUMINA_CLIENT_PATH=../client
LUMINA_MOBILE_PATH=../mobile
```

Or in the Lumina configuration block:

```ruby title="config/initializers/lumina.rb"
Lumina.configure do |c|
  c.client_path = ENV['LUMINA_CLIENT_PATH']
  c.mobile_path = ENV['LUMINA_MOBILE_PATH']
end
```

When both paths are set, the command writes to both:
- `{client_path}/src/types/lumina.d.ts`
- `{mobile_path}/src/types/lumina.d.ts`

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

| ActiveRecord Type | TypeScript Type |
|------------------|----------------|
| `:integer`, `:bigint` | `number` |
| `:decimal`, `:float` | `number` |
| `:boolean` | `boolean` |
| `:datetime`, `:date`, `:time` | `string` |
| `:json`, `:jsonb` | `Record<string, unknown>` |
| `:string`, `:text` | `string` |
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
Lumina's policy system (`permitted_attributes_for_show`, `hidden_attributes_for_show`) dynamically controls which fields appear in API responses based on the authenticated user's role and custom logic. The generated types represent the **union of all possible fields**, not a guarantee of which fields will be present in any given response.
:::

## Workflow

1. Define your models and run migrations
2. Run `rails lumina:export_types`
3. Import the generated types in your React/React Native code
4. Re-run the command whenever you change your database schema
