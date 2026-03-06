# Lumina AdonisJS Server — Querying (Skill)

You are a senior software engineer specialized in **Lumina**, an AdonisJS package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **AdonisJS (TypeScript)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's advanced querying capabilities for AdonisJS: filtering via `?filter[field]=value`, sorting via `?sort=-created_at`, full-text search via `?search=term` (including relationship search with dot notation), pagination via `?page=1&per_page=15` with response headers, field selection via `?fields[model]=id,title`, eager loading via `?include=author,comments` (including nested includes, counts, and exists), include authorization, model configuration properties for each feature, per-page clamping, disabling pagination, and combining all query parameters.

---

## Documentation

### Model Configuration

Define what is queryable on your model using the `HasLumina` mixin properties:

```ts
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'

export default class Post extends LuminaModel {
  // Fields that can be filtered
  static $allowedFilters = ['status', 'user_id', 'category_id']

  // Fields that can be sorted
  static $allowedSorts = ['created_at', 'title', 'updated_at', 'published_at']

  // Default sort when none specified (prefix with - for descending)
  static $defaultSort = '-created_at'

  // Fields that can be selected
  static $allowedFields = ['id', 'title', 'content', 'status', 'created_at']

  // Relationships that can be eager loaded
  static $allowedIncludes = ['user', 'comments', 'tags', 'category']

  // Fields searched with ?search= parameter
  static $allowedSearch = ['title', 'content', 'user.name']
}
```

Fields **not** listed in these arrays are silently ignored. This is a security feature -- users cannot filter or sort by columns you have not explicitly allowed.

### Filtering

Filter records by field values using the `?filter[field]=value` syntax:

```bash
# Single filter
GET /api/posts?filter[status]=published

# Multiple filters (AND)
GET /api/posts?filter[status]=published&filter[user_id]=1

# Multiple values for one field (OR via comma-separated)
GET /api/posts?filter[status]=draft,published
```

Only fields listed in `$allowedFilters` can be filtered.

When a filter value contains commas, the query builder produces a `WHERE col IN (...)` clause. Otherwise it produces a simple `WHERE col = ?` clause.

```bash
# Posts by a specific user
GET /api/posts?filter[user_id]=42

# Published posts in a category
GET /api/posts?filter[status]=published&filter[category_id]=5

# Posts that are either draft or published (excludes archived)
GET /api/posts?filter[status]=draft,published
```

### Sorting

Sort records by one or more fields using the `?sort=` parameter:

```bash
# Ascending
GET /api/posts?sort=title

# Descending (prefix with -)
GET /api/posts?sort=-created_at

# Multiple sorts (first by status ascending, then by date descending)
GET /api/posts?sort=status,-created_at
```

Only fields listed in `$allowedSorts` can be sorted. If no sort is specified, `$defaultSort` is used.

Every model can specify a default sort:

```ts
static $defaultSort = '-created_at'
```

The default sort supports the same comma-separated format as the query parameter.

### Search

Full-text search across configured fields using `?search=`:

```bash
GET /api/posts?search=adonis
```

Searches across all fields listed in `$allowedSearch`. The query builder produces an `OR ILIKE '%term%'` clause for each configured column, wrapped in a single `WHERE (...)` group.

#### Relationship Search

You can search across relationships using dot notation:

```ts
static $allowedSearch = ['title', 'content', 'user.name']
```

```bash
# This searches in post.title, post.content, AND user.name
GET /api/posts?search=john
```

Dot-notation columns (e.g., `user.name`) are resolved via `whereHas` on the relationship so that the `ILIKE` runs on the related table.

You can combine search with filters:

```bash
# Search for "adonis" only in published posts
GET /api/posts?search=adonis&filter[status]=published
```

### Pagination

Control page size and navigate through results:

```bash
# Page 1 with 20 items per page
GET /api/posts?page=1&per_page=20

# Page 3
GET /api/posts?page=3&per_page=20
```

#### Pagination Headers

Pagination metadata is returned in **response headers**, not the body:

```
X-Current-Page: 2
X-Last-Page: 10
X-Per-Page: 20
X-Total: 195
```

The response body contains only the data array:

```json
[
  { "id": 21, "title": "Post 21" },
  { "id": 22, "title": "Post 22" }
]
```

#### Per-Page Clamping

The `per_page` value is clamped to the range [1, 100]. Requesting `per_page=0` is clamped to 1, and `per_page=500` is clamped to 100.

#### Disabling Pagination

To return all results without pagination:

```ts
export default class Tag extends LuminaModel {
  static $paginationEnabled = false
}
```

#### Changing Default Page Size

```ts
export default class Post extends LuminaModel {
  static $perPage = 25 // Default items per page (default is 15)
}
```

#### Pagination Behavior Summary

| Scenario | Result |
|----------|--------|
| No `?per_page`, `$paginationEnabled = false` | Returns all results (no pagination) |
| No `?per_page`, `$paginationEnabled = true` | Uses model's `$perPage` (default 15) |
| `?per_page=20` | Overrides model default, paginates at 20 |
| `?per_page=0` | Clamped to 1 |
| `?per_page=500` | Clamped to 100 |

### Field Selection

Select only specific fields to reduce payload size:

```bash
# Select specific fields
GET /api/posts?fields[posts]=id,title,status

# Select fields on included relationships too
GET /api/posts?fields[posts]=id,title&fields[users]=id,name&include=user
```

Only fields listed in `$allowedFields` can be selected.

The `id` column is always included automatically, even if not specified. The table name or model slug is used as the key in the `fields` parameter.

### Eager Loading (Includes)

Load related models in a single request:

```bash
# Load single relationship
GET /api/posts?include=user

# Load multiple relationships
GET /api/posts?include=user,comments,tags

# Load nested relationships
GET /api/posts?include=comments.user
```

Only relationships listed in `$allowedIncludes` can be loaded. Nested includes (e.g., `comments.user`) are supported via chained `preload` calls -- the top-level segment must be in the allowed list.

#### Count and Exists

Get relationship counts or existence checks by appending `Count` or `Exists` to an include name:

```bash
# Get the count of comments for each post
GET /api/posts?include=commentsCount

# Check if comments exist (boolean)
GET /api/posts?include=commentsExists
```

Response:

```json
{
  "id": 1,
  "title": "My Post",
  "comments_count": 15,
  "comments_exists": true
}
```

These suffixes are authorized against the base relationship name (`comments`), so the user needs `comments.index` permission.

#### Include Authorization

When loading includes, Lumina checks if the user has `viewAny` permission on the included resource. If not, a 403 is returned:

```bash
# If user doesn't have 'comments.index' permission:
GET /api/posts?include=comments
# 403 { "message": "You do not have permission to include comments." }
```

This applies to all includes, including nested ones. A request like `?include=comments.author` checks permissions on both `comments` and the author resource.

### Combined Example

```bash
GET /api/posts?filter[status]=published&sort=-created_at&include=user,comments&fields[posts]=id,title,excerpt&search=adonis&page=1&per_page=20
```

This single request:

- Filters to published posts only
- Sorts newest first
- Eager loads user and comments
- Returns only id, title, and excerpt fields
- Searches for "adonis" in searchable columns
- Returns page 1 with 20 items per page

Response headers:

```
X-Current-Page: 1
X-Last-Page: 3
X-Per-Page: 20
X-Total: 47
```

Response body:

```json
[
  {
    "id": 42,
    "title": "Getting Started with AdonisJS",
    "excerpt": "A beginner's guide to AdonisJS...",
    "user": {
      "id": 1,
      "name": "John Doe"
    },
    "comments": [
      { "id": 1, "content": "Great article!", "user_id": 2 }
    ]
  }
]
```

---

## Frequently Asked Questions

**Q: How do I filter by multiple values for the same field?**

A: Use comma-separated values. This creates a `WHERE col IN (...)` clause:

```bash
GET /api/posts?filter[status]=draft,published
```

This returns posts where status is either `draft` or `published`.

**Q: What happens if I try to filter by a field not in `$allowedFilters`?**

A: The filter is silently ignored. This is a security feature -- users cannot filter by columns you have not explicitly allowed. No error is returned.

**Q: How do I sort by multiple columns?**

A: Use comma-separated values in the `sort` parameter:

```bash
# Sort by status ascending, then by created_at descending
GET /api/posts?sort=status,-created_at
```

**Q: How do I search across a related model's fields?**

A: Use dot notation in `$allowedSearch`:

```ts
static $allowedSearch = ['title', 'content', 'user.name']
```

```bash
GET /api/posts?search=john
```

This searches `post.title`, `post.content`, and `user.name` using `whereHas` on the `user` relationship.

**Q: How do I get the total count of records without fetching all data?**

A: Pagination headers include `X-Total`. Make any paginated request and read the header:

```bash
GET /api/posts?page=1&per_page=1
# Response header: X-Total: 195
```

**Q: Can I load nested relationships like `comments.user`?**

A: Yes. The top-level relationship (`comments`) must be in `$allowedIncludes`:

```bash
GET /api/posts?include=comments.user
```

Lumina resolves this via chained `preload` calls. Include authorization checks permissions on both the `comments` and `users` resources.

**Q: How do I get a count of related records instead of loading them?**

A: Append `Count` to the relationship name:

```bash
GET /api/posts?include=commentsCount
```

This adds a `comments_count` field to each post in the response. You can also use `commentsExists` for a boolean check.

---

## Real-World Examples

### Example 1: Blog Dashboard with Advanced Filtering

```ts
// app/models/post.ts
import { column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import User from '#models/user'
import Comment from '#models/comment'

export default class Post extends LuminaModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column()
  declare excerpt: string

  @column()
  declare content: string

  @column()
  declare status: string

  @column()
  declare categoryId: number

  @column()
  declare userId: number

  static $allowedFilters = ['status', 'category_id', 'user_id']
  static $allowedSorts = ['created_at', 'title', 'updated_at']
  static $defaultSort = '-created_at'
  static $allowedFields = ['id', 'title', 'excerpt', 'status', 'created_at']
  static $allowedIncludes = ['user', 'comments', 'category']
  static $allowedSearch = ['title', 'excerpt', 'content', 'user.name']
  static $perPage = 20

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => Comment)
  declare comments: HasMany<typeof Comment>
}
```

Frontend queries:

```bash
# Dashboard: recent published posts with author info and comment count
GET /api/posts?filter[status]=published&sort=-created_at&include=user,commentsCount&fields[posts]=id,title,excerpt,status&per_page=10

# Author's drafts
GET /api/posts?filter[status]=draft&filter[user_id]=5&sort=-updated_at

# Search across posts and author names
GET /api/posts?search=typescript&filter[status]=published&include=user
```

### Example 2: E-Commerce Product Catalog

```ts
// app/models/product.ts
import { column, belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'
import Category from '#models/category'
import Tag from '#models/tag'

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
  declare status: string

  @column()
  declare categoryId: number

  static $allowedFilters = ['status', 'category_id']
  static $allowedSorts = ['created_at', 'name', 'price']
  static $defaultSort = 'name'
  static $allowedFields = ['id', 'name', 'description', 'price', 'status']
  static $allowedIncludes = ['category', 'tags']
  static $allowedSearch = ['name', 'description']
  static $perPage = 24

  @belongsTo(() => Category)
  declare category: BelongsTo<typeof Category>

  @manyToMany(() => Tag)
  declare tags: ManyToMany<typeof Tag>
}
```

Frontend queries:

```bash
# Category page: active products sorted by price
GET /api/products?filter[status]=active&filter[category_id]=3&sort=price&include=tags&per_page=24

# Search with minimal fields for autocomplete
GET /api/products?search=laptop&fields[products]=id,name,price&per_page=5

# Product detail with all relationships
GET /api/products/42?include=category,tags
```

### Example 3: Lookup Table with No Pagination

```ts
// app/models/tag.ts
import { column } from '@adonisjs/lucid/orm'
import LuminaModel from '@startsoft/lumina-adonis/models/lumina_model'

export default class Tag extends LuminaModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare slug: string

  static $allowedFilters = ['name']
  static $allowedSorts = ['name']
  static $defaultSort = 'name'
  static $allowedSearch = ['name']
  static $paginationEnabled = false  // Return all tags at once
}
```

```bash
# Get all tags alphabetically (no pagination)
GET /api/tags?sort=name

# Search tags
GET /api/tags?search=java
```
