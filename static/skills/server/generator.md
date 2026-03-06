# Lumina Laravel Server — Generator (Skill)

You are a senior software engineer specialized in **Lumina**, a Laravel package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **Laravel (PHP)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's interactive CLI generator commands: `lumina:install`, `lumina:generate` (models, policies, scopes), `lumina:export-postman`, and `invitation:link`. Includes supported column types and generated file examples.

---

## Documentation

### Commands Overview

| Command | Alias | Description |
|---------|-------|-------------|
| `lumina:install` | — | Interactive project setup |
| `lumina:generate` | `lumina:g` | Scaffold resources (models, policies, scopes) |
| `lumina:export-postman` | — | Generate Postman collection |
| `invitation:link` | — | Generate invitation link for testing |

### lumina:install

```bash
php artisan lumina:install
```

Walks through:
1. **Core Setup** — publishes config and routes
2. **Feature Selection** — multi-tenant, audit trail, Cursor AI toolkit
3. **Multi-Tenant Options** — resolution strategy, org identifier, default roles
4. **Test Framework** — Pest or PHPUnit

### lumina:generate

```bash
php artisan lumina:generate
# or
php artisan lumina:g
```

#### Generating a Model

Interactive prompts for resource name and columns. Creates:

**Model** (`app/Models/BlogPost.php`):
```php
class BlogPost extends LuminaModel
{
    protected $fillable = ['title', 'content', 'status', 'user_id', 'published_at'];

    protected $validationRules = [
        'title'        => 'string|max:255',
        'content'      => 'string',
        'status'       => 'string',
        'user_id'      => 'integer|exists:users,id',
        'published_at' => 'date',
    ];

    public static $allowedFilters  = ['status', 'user_id'];
    public static $allowedSorts    = ['created_at', 'title'];
    public static $defaultSort     = '-created_at';
    public static $allowedIncludes = ['user'];
    public static $allowedSearch   = ['title', 'content'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
```

**Migration** (`database/migrations/xxxx_create_blog_posts_table.php`):
```php
Schema::create('blog_posts', function (Blueprint $table) {
    $table->id();
    $table->string('title');
    $table->text('content');
    $table->string('status')->default('draft');
    $table->foreignId('user_id')->constrained();
    $table->dateTime('published_at')->nullable();
    $table->softDeletes();
    $table->timestamps();
});
```

**Factory** (`database/factories/BlogPostFactory.php`):
```php
class BlogPostFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title'        => fake()->sentence(),
            'content'      => fake()->paragraphs(3, true),
            'status'       => fake()->randomElement(['draft', 'published']),
            'user_id'      => User::factory(),
            'published_at' => fake()->optional()->dateTime(),
        ];
    }
}
```

Auto-registers in `config/lumina.php`:
```php
'models' => ['blog-posts' => \App\Models\BlogPost::class],
```

#### Generating a Policy

```php
class BlogPostPolicy extends ResourcePolicy
{
    protected $resourceSlug = 'blog-posts';
}
```

#### Generating a Scope

```php
class BlogPostScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        // Add your global scope logic
    }
}
```

### Supported Column Types

| Type | Migration | Factory |
|------|-----------|---------|
| `string` | `$table->string('name')` | `fake()->sentence()` |
| `text` | `$table->text('body')` | `fake()->paragraphs(3, true)` |
| `integer` | `$table->integer('count')` | `fake()->numberBetween(0, 100)` |
| `boolean` | `$table->boolean('active')` | `fake()->boolean()` |
| `date` | `$table->date('published_at')` | `fake()->date()` |
| `datetime` | `$table->dateTime('starts_at')` | `fake()->dateTime()` |
| `decimal` | `$table->decimal('price', 10, 2)` | `fake()->randomFloat(2, 0, 999)` |
| `uuid` | `$table->uuid('external_id')` | `fake()->uuid()` |
| `foreignId` | `$table->foreignId('user_id')->constrained()` | `User::factory()` |

### lumina:export-postman

```bash
php artisan lumina:export-postman
```

Creates a Postman Collection v2.1 with:
- All CRUD endpoints for every model
- Soft delete endpoints
- Auth endpoints (login, logout, register)
- Invitation and nested operations endpoints
- Pre-configured auth headers and example bodies

Config:
```php
'postman' => [
    'role_class'      => 'App\Models\Role',
    'user_role_class'  => 'App\Models\UserRole',
    'user_class'       => 'App\Models\User',
],
```

### invitation:link

```bash
php artisan invitation:link
```

Creates a new invitation and outputs the acceptance URL. Useful for testing the invitation flow without sending emails.

---

## Frequently Asked Questions

**Q: How do I scaffold a new model quickly?**

A: Run `php artisan lumina:generate` (or `lumina:g`), select "Model", name it, and define columns interactively. It creates the model, migration, and factory — and auto-registers it in config.

**Q: What's the difference between `lumina:install` and `lumina:generate`?**

A: `lumina:install` sets up the entire framework (config, routes, multi-tenancy, audit trail). You run it once. `lumina:generate` scaffolds individual resources (models, policies, scopes) — you run it whenever you need a new resource.

**Q: Can I generate just a policy without a model?**

A: Yes. Run `lumina:generate`, select "Policy", and enter the model name. It creates a policy extending `ResourcePolicy` with the correct resource slug.

**Q: How do I export my API for Postman?**

A: Run `php artisan lumina:export-postman`. It generates a JSON file you can import directly into Postman with all endpoints, auth headers, and example bodies.

**Q: What test framework does the generator use?**

A: It respects the `test_framework` setting in `config/lumina.php`. You can choose `'pest'` or `'phpunit'` during `lumina:install`.

**Q: How do I generate a test invitation link?**

A: Run `php artisan invitation:link`. It creates an invitation record and outputs the URL — no email needed.

---

## Real-World Examples

### Scaffolding a Complete Blog Feature

```bash
# 1. Generate the model with migration and factory
php artisan lumina:g
# → Select Model, name: "BlogPost"
# → Columns: title (string), content (text), status (string, default: draft),
#             user_id (foreignId), published_at (datetime, nullable)

# 2. Generate the policy
php artisan lumina:g
# → Select Policy, name: "BlogPost"

# 3. Generate a custom scope (optional)
php artisan lumina:g
# → Select Scope, name: "BlogPost"

# 4. Run migrations
php artisan migrate

# 5. Export Postman collection to test
php artisan lumina:export-postman
```

You now have:
- `app/Models/BlogPost.php` — model with validation, filters, sorts
- `database/migrations/xxxx_create_blog_posts_table.php` — migration
- `database/factories/BlogPostFactory.php` — factory for testing
- `app/Policies/BlogPostPolicy.php` — policy with ResourcePolicy base
- `app/Models/Scopes/BlogPostScope.php` — custom scope
- Blog post auto-registered in `config/lumina.php`
- Full Postman collection for API testing
