---
sidebar_position: 0
title: Introduction
slug: /
---

# What is Lumina?

Lumina is a full-stack library that turns your Laravel Eloquent models into a complete REST API — with React hooks to consume it. No boilerplate controllers, no manual route definitions, no hand-written fetch calls.

**Register a model. Get an API. Use a hook.**

## How It Works

```
┌─────────────────────────┐         ┌──────────────────────────┐
│   React / React Native  │  HTTP   │     Laravel Server       │
│                         │◄───────►│                          │
│  useModelIndex('posts') │         │  'posts' => Post::class  │
│  useModelStore('posts') │         │                          │
│  useModelUpdate('posts')│         │  Automatic CRUD routes   │
│  useModelDelete('posts')│         │  Validation, Policies    │
│  useAuth()              │         │  Multi-tenancy, Audit    │
└─────────────────────────┘         └──────────────────────────┘
    @startsoft/lumina                    startsoft/lumina
```

## Features

- **Automatic REST API** — register a model, get full CRUD endpoints with zero controllers
- **React Hooks** — TanStack Query hooks for every endpoint (index, show, store, update, delete)
- **Role-Based Permissions** — per-organization roles with wildcard support (`posts.*`, `*`)
- **Role-Based Validation** — different fields allowed per role (admin vs editor vs viewer)
- **Multi-Tenancy** — built-in organization scoping via URL prefix or subdomain
- **Soft Deletes** — trash, restore, and force-delete with separate permissions
- **Audit Trail** — automatic change logging (who changed what, when)
- **Nested Operations** — atomic multi-model transactions with cross-references
- **Invitation System** — invite users to organizations with role assignment
- **Query Builder** — filters, sorts, search, pagination, includes, field selection
- **React Native Support** — same hooks with platform-adapted storage and networking

## Quick Install

### Server (Laravel)

```bash
composer require startsoft/lumina dev-main
php artisan lumina:install
```

### Client (React)

```bash
npm install @startsoft/lumina @tanstack/react-query axios
```

## Hello World Example

### 1. Register a model on the server

```php
// config/lumina.php
return [
    'models' => [
        'posts' => \App\Models\Post::class,
    ],
];
```

This automatically creates these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/posts` | List with filters, sorts, search |
| `POST` | `/api/posts` | Create with validation |
| `GET` | `/api/posts/{id}` | Show single record |
| `PUT` | `/api/posts/{id}` | Update with validation |
| `DELETE` | `/api/posts/{id}` | Soft delete |

### 2. Use it from React

```tsx
import { useModelIndex, useModelStore } from '@startsoft/lumina';

function Posts() {
  // Fetch posts with pagination and sorting
  const { data: response, isLoading } = useModelIndex('posts', {
    page: 1,
    perPage: 10,
    sort: '-created_at',
  });

  // Create a new post
  const createPost = useModelStore('posts');

  const handleCreate = () => {
    createPost.mutate({ title: 'My First Post', content: 'Hello world!' });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={handleCreate}>New Post</button>
      {response?.data.map(post => (
        <h2 key={post.id}>{post.title}</h2>
      ))}
    </div>
  );
}
```

## What's Next?

<div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem'}}>

<div style={{border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', padding: '1.5rem'}}>

### Laravel Server

Set up your backend with models, validation, permissions, and multi-tenancy.

**[Get Started →](./server/getting-started)**

</div>

<div style={{border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', padding: '1.5rem'}}>

### React Client

Use hooks to build your UI with authentication, CRUD, and real-time data.

**[Get Started →](./react/getting-started)**

</div>

</div>
