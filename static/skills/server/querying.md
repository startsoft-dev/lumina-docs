# Lumina Laravel Server — Querying (Skill)

You are a senior software engineer specialized in **Lumina**, a Laravel package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **Laravel (PHP)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's advanced querying capabilities: filtering, sorting, search, pagination, field selection (sparse fieldsets), eager loading (includes), and how to combine them. Powered by Spatie Query Builder.

---

## Documentation

### Model Configuration

Define what's queryable on your model:

```php
class Post extends Model
{
    public static $allowedFilters  = ['status', 'user_id', 'category_id'];
    public static $allowedSorts    = ['created_at', 'title', 'updated_at', 'published_at'];
    public static $defaultSort     = '-created_at';
    public static $allowedFields   = ['id', 'title', 'content', 'status', 'created_at'];
    public static $allowedIncludes = ['user', 'comments', 'tags', 'category'];
    public static $allowedSearch   = ['title', 'content', 'user.name'];
}
```

Fields **not** listed are silently ignored — this is a security feature.

### Filtering

```bash
# Single filter
GET /api/posts?filter[status]=published

# Multiple filters (AND)
GET /api/posts?filter[status]=published&filter[user_id]=1

# Multiple values for one field (OR)
GET /api/posts?filter[status]=draft,published
```

### Sorting

```bash
# Ascending
GET /api/posts?sort=title

# Descending (prefix with -)
GET /api/posts?sort=-created_at

# Multiple sorts
GET /api/posts?sort=status,-created_at
```

### Search

```bash
GET /api/posts?search=laravel
```

Searches across all `$allowedSearch` fields. Can search across relationships too:

```php
public static $allowedSearch = ['title', 'content', 'user.name'];
```

### Pagination

```bash
GET /api/posts?page=1&per_page=20
```

Pagination metadata in **response headers**:

```
X-Current-Page: 2
X-Last-Page: 10
X-Per-Page: 20
X-Total: 195
```

Disable pagination:
```php
public static bool $paginationEnabled = false;
```

Change default page size:
```php
protected $perPage = 25;
```

### Field Selection

```bash
GET /api/posts?fields[posts]=id,title,status
GET /api/posts?fields[posts]=id,title&fields[users]=id,name&include=user
```

### Eager Loading (Includes)

```bash
GET /api/posts?include=user
GET /api/posts?include=user,comments,tags
GET /api/posts?include=comments.user  # nested
```

Count and existence checks:
```bash
GET /api/posts?include=commentsCount
GET /api/posts?include=commentsExists
```

Include authorization: Lumina checks `viewAny` permission on included resources. If denied → 403.

### Combined Example

```bash
GET /api/posts?filter[status]=published&sort=-created_at&include=user,comments&fields[posts]=id,title,excerpt&search=laravel&page=1&per_page=20
```

---

## Frequently Asked Questions

**Q: How do I filter by multiple values on the same field?**

A: Comma-separate the values:

```bash
GET /api/posts?filter[status]=draft,published
```

This returns posts where status is either `draft` OR `published`.

**Q: Why is my filter being ignored?**

A: Filters only work on fields listed in `$allowedFilters`. If the field isn't in that array, it's silently ignored for security. Add it:

```php
public static $allowedFilters = ['status', 'user_id', 'category_id'];
```

**Q: How does pagination work? Where are the page numbers?**

A: Pagination data comes in **response headers**, not the body:

```
X-Current-Page: 1
X-Last-Page: 5
X-Per-Page: 20
X-Total: 95
```

The response body is just the data array. This keeps the API clean and consistent.

**Q: Can I search across related model fields?**

A: Yes! Use dot notation in `$allowedSearch`:

```php
public static $allowedSearch = ['title', 'content', 'user.name'];
```

Now `?search=john` searches in post title, post content, AND the user's name.

**Q: How do I get a count of related records without loading them?**

A: Use the `Count` suffix:

```bash
GET /api/posts?include=commentsCount
```

Response:
```json
{
    "id": 1,
    "title": "My Post",
    "comments_count": 15
}
```

**Q: Can a user bypass permissions through includes?**

A: No. When using `?include=comments`, Lumina checks that the user has `comments.index` permission. If they don't, the request returns 403. This prevents permission bypass through eager loading.

---

## Real-World Examples

### Example 1: Blog Listing Page

```bash
# Published posts, newest first, with author info, only essential fields
GET /api/posts?filter[status]=published&sort=-published_at&include=user&fields[posts]=id,title,excerpt,published_at&fields[users]=id,name,avatar&per_page=10
```

### Example 2: Admin Dashboard Search

```bash
# Search all posts for "refund", include comment counts, all statuses
GET /api/posts?search=refund&include=commentsCount&sort=-created_at&per_page=50
```

### Example 3: Category-Filtered Products

```bash
# Products in category 5, sorted by price, with reviews
GET /api/products?filter[category_id]=5&sort=price&include=reviews&per_page=24
```

### Model Configuration for an E-Commerce Product

```php
class Product extends LuminaModel
{
    public static $allowedFilters  = ['category_id', 'brand_id', 'in_stock'];
    public static $allowedSorts    = ['price', 'name', 'created_at', 'rating'];
    public static $defaultSort     = '-created_at';
    public static $allowedFields   = ['id', 'name', 'price', 'thumbnail', 'rating'];
    public static $allowedIncludes = ['category', 'brand', 'reviews', 'images'];
    public static $allowedSearch   = ['name', 'sku', 'description'];

    protected $perPage = 24;
}
```
