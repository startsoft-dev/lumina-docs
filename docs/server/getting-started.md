---
sidebar_position: 1
title: Getting Started
---

# Laravel Server — Getting Started

Install Lumina and go from zero to a full REST API in under 5 minutes.

## Requirements

- PHP 8.0+
- Laravel 10+
- Composer

## Installation

```bash
composer require startsoft/lumina dev-main
```

Then run the interactive installer:

```bash
php artisan lumina:install
```

The installer will walk you through:

- Publishing config and routes
- Enabling multi-tenant support (organizations, roles)
- Enabling audit trail (change logging)
- Setting up Cursor AI toolkit (rules, skills, agents)

## Configuration

After installation, your config file is at `config/lumina.php`:

```php
// config/lumina.php
return [
    // Model registration — slug => model class
    'models' => [
        'posts'    => \App\Models\Post::class,
        'comments' => \App\Models\Comment::class,
    ],

    // Models that don't require authentication
    'public' => [
        'posts',  // These endpoints skip auth middleware
    ],

    // Multi-tenancy settings
    'multi_tenant' => [
        'enabled' => false,                        // Enable organization scoping
        'use_subdomain' => false,                  // true = subdomain, false = URL prefix
        'organization_identifier_column' => 'id',  // 'id', 'slug', or 'uuid'
        'middleware' => null,                       // Custom middleware class
    ],

    // Invitation system
    'invitations' => [
        'expires_days' => env('INVITATION_EXPIRES_DAYS', 7),
        'allowed_roles' => null,  // null = all roles, or ['admin', 'editor']
    ],

    // Nested operations
    'nested' => [
        'path' => 'nested',         // Route path
        'max_operations' => 50,     // Max ops per request
        'allowed_models' => null,   // null = all registered models
    ],

    // Generator settings
    'test_framework' => 'pest',  // 'pest' or 'phpunit'

    // Postman export
    'postman' => [
        'role_class'      => 'App\Models\Role',
        'user_role_class'  => 'App\Models\UserRole',
        'user_class'       => 'App\Models\User',
    ],
];
```

## Environment Variables

Add these to your `.env` file as needed:

```env
# Invitation expiration (days)
INVITATION_EXPIRES_DAYS=7
```

## Register Your First Model

Create a model (or use the [generator](./generator)):

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Lumina\LaravelApi\Traits\HasValidation;
use Lumina\LaravelApi\Traits\BelongsToOrganization;

class Post extends Model
{
    use SoftDeletes, HasValidation, BelongsToOrganization;

    protected $fillable = ['title', 'content', 'status', 'user_id'];

    // Validation
    protected $validationRules = [
        'title'   => 'string|max:255',
        'content' => 'string',
        'status'  => 'string|in:draft,published,archived',
    ];

    protected $validationRulesStore = ['title', 'content'];

    protected $validationRulesUpdate = ['title', 'content', 'status'];

    // Query configuration
    public static $allowedFilters  = ['status', 'user_id'];
    public static $allowedSorts    = ['created_at', 'title', 'updated_at'];
    public static $defaultSort     = '-created_at';
    public static $allowedIncludes = ['user', 'comments'];
    public static $allowedSearch   = ['title', 'content'];

    // Relationships
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

That's it. You now have a full REST API for posts:

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

:::tip Multi-Tenant Routes
When multi-tenancy is enabled, all routes are prefixed with `{organization}`:

```
GET /api/{organization}/posts
POST /api/{organization}/posts
```
:::

## Authentication Endpoints

Lumina also provides auth routes out of the box:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login, returns API token |
| `POST` | `/api/auth/logout` | Revoke all tokens |
| `POST` | `/api/auth/password/recover` | Send password reset email |
| `POST` | `/api/auth/password/reset` | Reset password with token |
| `POST` | `/api/auth/register` | Register via invitation token |

## Run Migrations

```bash
php artisan migrate
```

This will create the necessary tables for audit logs, invitations, and any model tables you've defined.

## Scaffold with the Generator

Use the interactive generator to create models, migrations, factories, policies, and scopes:

```bash
php artisan lumina:generate
```

```
+ Lumina :: Generate :: Scaffold your resources +

 What type of resource would you like to generate?
 > Model (with migration and factory)

 What is the resource name?
 > Post

 Creating Post model, migration, and factory ..................... done
```

See the [Generator docs](./generator) for all options.

## Next Steps

- [Model Configuration](./models) — properties, traits, relationships
- [Validation](./validation) — per-action and role-based validation rules
- [Querying](./querying) — filters, sorts, search, pagination, includes
- [Policies](./policies) — role-based authorization and permissions
- [Multi-Tenancy](./multi-tenancy) — organization scoping and roles
