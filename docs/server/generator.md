---
sidebar_position: 10
title: Generator
---

# Interactive Generator

Scaffold models, policies, scopes, and more with interactive CLI commands.

## Commands Overview

| Command | Alias | Description |
|---------|-------|-------------|
| `lumina:install` | — | Interactive project setup |
| `lumina:generate` | `lumina:g` | Scaffold resources (models, policies, scopes) |
| `lumina:export-postman` | — | Generate Postman collection |
| `invitation:link` | — | Generate invitation link for testing |

## lumina:install

Interactive installer that sets up the entire Lumina framework:

```bash
php artisan lumina:install
```

The installer walks you through:

### 1. Core Setup
- Publishes `config/lumina.php`
- Publishes route files

### 2. Feature Selection
- **Multi-tenant support** — creates organizations, roles, user_roles tables, and middleware
- **Audit trail** — creates audit_logs migration
- **Cursor AI toolkit** — sets up AI rules, skills, and agents

### 3. Multi-Tenant Options (if enabled)
- **Resolution strategy**: route prefix vs subdomain
- **Organization identifier**: `id`, `slug`, or `uuid`
- **Default roles**: creates seeder with admin, editor, viewer roles

### 4. Test Framework
- Choose between **Pest** or **PHPUnit** for generated tests

## lumina:generate

Interactively scaffold resources:

```bash
php artisan lumina:generate
# or
php artisan lumina:g
```

### Generating a Model

```
+ Lumina :: Generate :: Scaffold your resources +

 What type of resource would you like to generate?
 > Model (with migration and factory)

 What is the resource name?
 > BlogPost

 Define your columns:

 Column name: title
 Column type: string
 Nullable? No
 Has index? No

 Column name: content
 Column type: text
 Nullable? No

 Column name: status
 Column type: string
 Default value: draft

 Column name: user_id
 Column type: foreignId

 Column name: published_at
 Column type: datetime
 Nullable? Yes

 Add another column? No

 Creating BlogPost model, migration, and factory .............. done
```

This generates:

**Model** (`app/Models/BlogPost.php`):
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Lumina\LaravelApi\Traits\HasValidation;

class BlogPost extends Model
{
    use SoftDeletes, HasValidation;

    protected $fillable = [
        'title', 'content', 'status', 'user_id', 'published_at',
    ];

    protected $validationRules = [
        'title'        => 'string|max:255',
        'content'      => 'string',
        'status'       => 'string',
        'user_id'      => 'integer|exists:users,id',
        'published_at' => 'date',
    ];

    protected $validationRulesStore = ['title', 'content'];
    protected $validationRulesUpdate = ['title', 'content', 'status'];

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

**Auto-registration** in `config/lumina.php`:
```php
'models' => [
    'blog-posts' => \App\Models\BlogPost::class,
],
```

### Generating a Policy

```bash
php artisan lumina:generate
# Select: Policy
# Resource name: BlogPost
```

Generates `app/Policies/BlogPostPolicy.php`:

```php
<?php

namespace App\Policies;

use Lumina\LaravelApi\Policies\ResourcePolicy;

class BlogPostPolicy extends ResourcePolicy
{
    protected $resourceSlug = 'blog-posts';

    // All CRUD methods inherited from ResourcePolicy
    // Override for custom authorization logic
}
```

### Generating a Scope

```bash
php artisan lumina:generate
# Select: Scope
# Resource name: BlogPost
```

Generates `app/Models/Scopes/BlogPostScope.php`:

```php
<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class BlogPostScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        // Add your global scope logic
        // e.g., $builder->where('is_visible', true);
    }
}
```

If the model uses the `HasAutoScope` trait, this scope is automatically applied.

## Supported Column Types

| Type | Migration | Factory | Example |
|------|-----------|---------|---------|
| `string` | `$table->string('name')` | `fake()->sentence()` | Titles, slugs, emails |
| `text` | `$table->text('body')` | `fake()->paragraphs(3, true)` | Long content |
| `integer` | `$table->integer('count')` | `fake()->numberBetween(0, 100)` | Counts, quantities |
| `boolean` | `$table->boolean('active')` | `fake()->boolean()` | Flags, toggles |
| `date` | `$table->date('published_at')` | `fake()->date()` | Dates without time |
| `datetime` | `$table->dateTime('starts_at')` | `fake()->dateTime()` | Dates with time |
| `decimal` | `$table->decimal('price', 10, 2)` | `fake()->randomFloat(2, 0, 999)` | Prices, amounts |
| `uuid` | `$table->uuid('external_id')` | `fake()->uuid()` | External IDs |
| `foreignId` | `$table->foreignId('user_id')->constrained()` | `User::factory()` | Relationships |

## lumina:export-postman

Generate a complete Postman Collection v2.1 for all registered models:

```bash
php artisan lumina:export-postman
```

This creates a JSON file you can import directly into Postman. The collection includes:

- All CRUD endpoints for every registered model
- Soft delete endpoints (trashed, restore, force-delete)
- Authentication endpoints (login, logout, register)
- Invitation endpoints (if multi-tenant)
- Nested operations endpoint
- Pre-configured authorization headers
- Example request bodies with validation rules

### Postman Config

```php
// config/lumina.php
'postman' => [
    'role_class'      => 'App\Models\Role',
    'user_role_class'  => 'App\Models\UserRole',
    'user_class'       => 'App\Models\User',
],
```

## invitation:link

Generate an invitation link for testing:

```bash
php artisan invitation:link
```

Creates a new invitation and outputs the acceptance URL. Useful for testing the invitation flow without sending emails.
