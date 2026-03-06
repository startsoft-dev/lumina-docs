# Lumina Laravel Server — Getting Started (Skill)

You are a senior software engineer specialized in **Lumina**, a Laravel package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **Laravel (PHP)** version of Lumina.

---

## What This Skill Covers

This skill covers the initial setup and installation of Lumina on a Laravel project: requirements, installation, configuration, registering models, generated endpoints, authentication routes, running migrations, and using the interactive generator.

---

## Documentation

### Requirements

- PHP 8.0+
- Laravel 10+
- Composer

### Installation

```bash
composer require startsoft/lumina dev-main
```

Then run the interactive installer:

```bash
php artisan lumina:install
```

The installer walks you through:
- Publishing config and routes
- Enabling multi-tenant support (organizations, roles)
- Enabling audit trail (change logging)
- Setting up Cursor AI toolkit (rules, skills, agents)

### Configuration

After installation, the config file lives at `config/lumina.php`:

```php
return [
    'models' => [
        'posts'    => \App\Models\Post::class,
        'comments' => \App\Models\Comment::class,
    ],
    'public' => [
        'posts',  // These endpoints skip auth middleware
    ],
    'multi_tenant' => [
        'enabled' => false,
        'use_subdomain' => false,
        'organization_identifier_column' => 'id',
        'middleware' => null,
    ],
    'invitations' => [
        'expires_days' => env('INVITATION_EXPIRES_DAYS', 7),
        'allowed_roles' => null,
    ],
    'nested' => [
        'path' => 'nested',
        'max_operations' => 50,
        'allowed_models' => null,
    ],
    'test_framework' => 'pest',
    'postman' => [
        'role_class'      => 'App\Models\Role',
        'user_role_class'  => 'App\Models\UserRole',
        'user_class'       => 'App\Models\User',
    ],
];
```

### Registering a Model

Create a model extending `LuminaModel`:

```php
<?php

namespace App\Models;

use Lumina\LaravelApi\Models\LuminaModel;

class Post extends LuminaModel
{
    protected $fillable = ['title', 'content', 'status', 'user_id'];

    protected $validationRules = [
        'title'   => 'string|max:255',
        'content' => 'string',
        'status'  => 'string|in:draft,published,archived',
    ];

    public static $allowedFilters  = ['status', 'user_id'];
    public static $allowedSorts    = ['created_at', 'title', 'updated_at'];
    public static $defaultSort     = '-created_at';
    public static $allowedIncludes = ['user', 'comments'];
    public static $allowedSearch   = ['title', 'content'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }
}
```

Register it in `config/lumina.php`:

```php
'models' => [
    'posts' => \App\Models\Post::class,
],
```

### Generated REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/posts` | List with filters, sorts, search, pagination |
| `POST` | `/api/posts` | Create with validation |
| `GET` | `/api/posts/{id}` | Show single record with relationships |
| `PUT` | `/api/posts/{id}` | Update with validation |
| `DELETE` | `/api/posts/{id}` | Soft delete |
| `GET` | `/api/posts/trashed` | List soft-deleted records |
| `POST` | `/api/posts/{id}/restore` | Restore soft-deleted record |
| `DELETE` | `/api/posts/{id}/force-delete` | Permanent delete |

When multi-tenancy is enabled, all routes are prefixed with `{organization}`:
```
GET /api/{organization}/posts
POST /api/{organization}/posts
```

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login, returns API token |
| `POST` | `/api/auth/logout` | Revoke all tokens |
| `POST` | `/api/auth/password/recover` | Send password reset email |
| `POST` | `/api/auth/password/reset` | Reset password with token |
| `POST` | `/api/auth/register` | Register via invitation token |

### Scaffolding with the Generator

```bash
php artisan lumina:generate
```

This interactively creates models, migrations, factories, policies, and scopes.

---

## Frequently Asked Questions

**Q: How do I install Lumina on my Laravel project?**

A: Two commands and you're set:

```bash
composer require startsoft/lumina dev-main
php artisan lumina:install
```

The installer is interactive — it'll walk you through everything: publishing config, enabling multi-tenancy, audit trail, etc. After that, run `php artisan migrate` and you're good to go.

**Q: How do I add a new resource/model to the API?**

A: Three steps:
1. Create a model extending `LuminaModel`
2. Register it in `config/lumina.php` under the `'models'` array
3. Run `php artisan migrate` if you have a new migration

That's it — Lumina auto-generates all CRUD endpoints, validation, and authorization for you.

**Q: How do I make an endpoint public (no authentication)?**

A: Add the model slug to the `'public'` array in `config/lumina.php`:

```php
'public' => ['posts'],
```

Now `GET /api/posts` won't require an auth token.

**Q: What does `LuminaModel` give me out of the box?**

A: `LuminaModel` extends Eloquent's `Model` and includes these traits automatically:
- `HasFactory` — Laravel factory support
- `SoftDeletes` — trash/restore/force-delete endpoints
- `HasValidation` — declarative validation rules
- `HidableColumns` — dynamic column hiding in API responses
- `HasAutoScope` — auto-discovery of scope classes

You can add more traits like `HasAuditTrail` or `BelongsToOrganization` manually when needed.

**Q: Can I use the generator to scaffold everything?**

A: Absolutely. Run `php artisan lumina:generate` (or `lumina:g` for short). It interactively creates:
- **Model** with migration and factory
- **Policy** with ResourcePolicy base
- **Scope** with HasAutoScope convention

It even auto-registers the model in your config file.

---

## Real-World Examples

### Example 1: Blog API from Scratch

```bash
# Install Lumina
composer require startsoft/lumina dev-main
php artisan lumina:install

# Generate a Post model
php artisan lumina:generate
# → Select "Model", name it "Post", add columns: title (string), content (text), status (string)

# Run migrations
php artisan migrate
```

Now you have: `GET /api/posts`, `POST /api/posts`, `PUT /api/posts/{id}`, `DELETE /api/posts/{id}` — all with validation, filtering, sorting, search, and pagination.

### Example 2: Multi-Tenant SaaS Setup

```php
// config/lumina.php
return [
    'models' => [
        'projects' => \App\Models\Project::class,
        'tasks'    => \App\Models\Task::class,
    ],
    'multi_tenant' => [
        'enabled' => true,
        'organization_identifier_column' => 'slug',
    ],
];
```

```php
// app/Models/Project.php
use Lumina\LaravelApi\Models\LuminaModel;
use Lumina\LaravelApi\Traits\BelongsToOrganization;

class Project extends LuminaModel
{
    use BelongsToOrganization;

    protected $fillable = ['name', 'description', 'organization_id'];
}
```

API calls are now org-scoped:
```bash
GET /api/acme-corp/projects    # Only Acme Corp's projects
POST /api/acme-corp/projects   # Creates project under Acme Corp
```
