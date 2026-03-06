# Lumina Architecture Reference

Complete architecture reference for the Lumina framework.

---

## System Overview

Lumina is a two-package framework:

1. **Server:** `startsoft/lumina` (Composer) -- Laravel package that auto-generates REST API routes for registered models with built-in authorization, validation, pagination, soft deletes, audit trails, and multi-tenancy.
2. **Client:** `@startsoft/lumina` (npm) -- React library providing hooks (built on TanStack Query 5) that consume the auto-generated API.

Models are registered by slug in `config/lumina.php`. The server generates all routes automatically. The client hooks reference models by the same slug.

---

## Request Lifecycle

```
Client Request (e.g., GET /api/acme-corp/posts?filter[status]=published&sort=-created_at)
       |
       v
[1] Laravel Router
       |  Routes are auto-generated from config/lumina.php registration
       v
[2] Organization Middleware (ResolveOrganizationFromRoute)
       |  Resolves organization from URL segment (e.g., 'acme-corp')
       |  Sets request()->get('organization') to Organization model instance
       v
[3] Model-Level Middleware ($middleware, $middlewareActions)
       |  Runs any middleware declared on the model
       v
[4] Policy Authorization
       |  Calls the appropriate policy method (viewAny, view, create, update, delete)
       |  ResourcePolicy checks {slug}.{action} permission for the user's role
       |  Returns 403 if denied
       v
[5] Scope (Data Filtering)
       |  Global scopes on the model filter the query
       |  BelongsToOrganization: WHERE organization_id = ?
       |  Custom scopes: role-based data visibility
       v
[6] Query Builder
       |  Applies: $allowedFilters, $allowedSorts, $allowedSearch,
       |           $allowedFields, $allowedIncludes, pagination
       |  Builds the final Eloquent query
       v
[7] Validation (for store/update only)
       |  Resolves validation rules from $validationRules + $validationRulesStore/$validationRulesUpdate
       |  For role-based: resolves user's role, picks matching rule set
       |  Strips fields not listed for the role (security)
       |  Returns 422 with errors if validation fails
       v
[8] Controller Action
       |  Global controller executes the CRUD operation
       |  For store: creates model with validated data
       |  For update: updates model with validated data
       |  For destroy: soft deletes model
       v
[9] Serialization + Hidden Columns
       |  Model is serialized to array/JSON
       |  HidableColumns trait merges:
       |    - Base hidden columns (password, remember_token, timestamps)
       |    - Static $additionalHiddenColumns
       |    - Policy hiddenColumns() (dynamic, role-based)
       v
[10] JSON Response
       |  Returns data with pagination headers
       |  Headers: X-Current-Page, X-Last-Page, X-Per-Page, X-Total
       v
Client receives response
```

---

## Three-Layer Authorization

Lumina uses three complementary layers for authorization. Each layer has a distinct responsibility:

```
Layer 1: POLICY (Action Authorization)
  Question: "Can this user perform this action?"
  Example: "Can editor create a post?" -> Yes/No
  Where: app/Policies/{Model}Policy.php extending ResourcePolicy
  How: Checks {slug}.{action} permission in user's role for the organization
  |
  v (if allowed)

Layer 2: SCOPE (Data Filtering)
  Question: "Which records can this user see?"
  Example: "Editors see only active records; admins see all"
  Where: app/Models/Scopes/{Model}Scope.php implementing Scope
  How: Adds WHERE clauses to the query based on user's role
  |
  v (filtered data)

Layer 3: HIDDEN COLUMNS (Column Visibility)
  Question: "Which fields can this user see on each record?"
  Example: "Editors cannot see 'internal_notes' or 'cost' columns"
  Where: Policy's hiddenColumns() method
  How: Removes columns from JSON serialization based on user's role
  |
  v (filtered fields)

Final: JSON Response to client
```

### Key Design Principles

1. **Role-based, never ownership-based.** Authorization is based on the user's role in the organization, not on whether the user "owns" the record. Ownership checks should be added as additional conditions in policy overrides when needed.

2. **Additive hidden columns.** The `hiddenColumns()` method returns columns to HIDE. These are merged with base hidden columns (password, timestamps, etc.) and static `$additionalHiddenColumns`. An empty return means no additional hiding.

3. **Silent field stripping.** In role-based validation, fields not listed for a role are silently removed from the request -- they are NOT rejected with a validation error. This prevents role escalation by ensuring users cannot set fields they are not authorized to.

---

## Multi-Tenancy Architecture

### Organization Resolution

```
Request URL: /api/acme-corp/posts
                  ^^^^^^^^^
                  Organization identifier

ResolveOrganizationFromRoute middleware:
  1. Extracts 'acme-corp' from URL
  2. Looks up Organization where slug = 'acme-corp'
  3. Sets request()->get('organization') = Organization model
  4. All subsequent code accesses organization via request()
```

### Direct Tenancy (BelongsToOrganization)

For models with an `organization_id` column:

```
Model uses BelongsToOrganization trait
  -> Boot: adds global scope WHERE organization_id = {org.id}
  -> Creating: auto-sets organization_id from request organization
  -> Provides organization() BelongsTo relationship
  -> Provides scopeForOrganization() local scope
```

### Indirect Tenancy (auto-detected)

For models that reach the organization through relationships, Lumina auto-detects the path by introspecting BelongsTo relationships:

```
Model: Task (has project_id, belongsTo Project)
Project: has organization_id

  -> Lumina auto-detects: Task -> project -> organization
```

Multi-hop example:
```
Comment (belongsTo Post, which belongsTo Blog with organization_id)
  -> Lumina auto-detects: Comment -> post -> blog -> organization
```

### Data Flow

```
Client sets organization:
  useAuth().setOrganization('acme-corp')
  -> Stored in localStorage as 'organization_slug'

Client makes API request:
  useModelIndex('posts', { ... })
  -> Constructs: GET /api/acme-corp/posts?...
  -> Organization slug in URL path

Server processes:
  1. Middleware resolves organization from URL
  2. BelongsToOrganization scope filters by organization_id
  3. Custom scopes can access organization via request()->get('organization')
  4. Policy can access organization via request()->get('organization')
```

---

## Permission System

### Permission Format

Permissions follow the `{slug}.{action}` format:

```
posts.index       - list posts
posts.show        - view a single post
posts.store       - create a post
posts.update      - update a post
posts.destroy     - delete a post
posts.trashed     - view trashed posts
posts.restore     - restore a trashed post
posts.forceDelete - permanently delete a post
```

### Wildcards

```
*          - full access to everything
posts.*    - full access to all post actions
```

### Permission Check Flow

```
ResourcePolicy.checkPermission($user, 'index')
  1. Resolve resource slug (from $resourceSlug property or config auto-resolution)
  2. Build permission string: 'posts.index'
  3. Call $user->hasPermission('posts.index', $organization)
  4. HasPermissions trait checks user_roles for the organization
  5. Compares against stored permissions (exact match, *, posts.*)
  6. Returns true/false
```

### Role-Permission Data Model

```
User -> UserRole (pivot) -> Role
  UserRole has: user_id, organization_id, role_id, permissions (JSON array)
  Role has: id, name, slug

User can have different roles in different organizations.
Permissions are stored as JSON arrays on UserRole: ["*"] or ["posts.*", "blogs.index"]
```

---

## Client Architecture

### Hook Hierarchy

```
configureApi()              -- configures Axios base URL and interceptors
  |
AuthProvider                -- provides auth context (token, login, logout)
  |
useAuth()                   -- reads auth context
useOrganization()           -- resolves current organization slug
  |
useModelIndex/Show/etc.     -- CRUD operations scoped to current organization
useModelTrashed/etc.        -- soft delete operations
useNestedOperations()       -- multi-model transactions
useInvitations/etc.         -- invitation management
useModelAudit()             -- audit trail
```

### Data Flow (Client)

```
1. configureApi({ baseURL }) -- sets Axios base URL
2. AuthProvider mounts -- reads token from storage
3. User calls login() -- POST /auth/login, stores token + org slug
4. useModelIndex('posts', {...})
   a. useOrganization() resolves 'acme-corp' from URL/storage
   b. Constructs URL: /api/acme-corp/posts?filter[status]=active&...
   c. Axios interceptor attaches Authorization: Bearer {token}
   d. TanStack Query manages caching, refetching, stale time
   e. Response parsed: data array + pagination from headers
5. Mutation hooks (store/update/delete) automatically invalidate related queries
```

### Cache Invalidation Strategy

| Mutation | Invalidates |
|----------|-------------|
| `useModelStore` | `useModelIndex` for same model |
| `useModelUpdate` | `useModelIndex` + `useModelShow` for same model |
| `useModelDelete` | `useModelIndex` + `useModelShow`; data appears in `useModelTrashed` |
| `useModelRestore` | `useModelTrashed` + `useModelIndex` |
| `useModelForceDelete` | `useModelTrashed` |
| `useNestedOperations` | All affected models' queries |

---

## File Structure Conventions

### Server (Laravel)

```
app/
  Models/
    Post.php                       -- Lumina model
    Scopes/
      PostScope.php                -- data filtering scope
  Policies/
    PostPolicy.php                 -- authorization policy
  Http/
    Middleware/
      CustomMiddleware.php         -- custom middleware
config/
  lumina.php                       -- model registration, multi-tenancy config
database/
  migrations/
    xxxx_create_posts_table.php    -- migration with softDeletes()
  factories/
    PostFactory.php                -- model factory
```

### Client (React)

```
src/
  types/
    post.ts                        -- TypeScript interface
  components/
    posts/
      PostList.tsx                  -- list with useModelIndex
      PostDetail.tsx                -- detail with useModelShow
      PostForm.tsx                  -- create/edit with useModelStore/useModelUpdate
      PostDeleteButton.tsx          -- delete with useModelDelete
  pages/
    LoginPage.tsx                   -- auth with useAuth
  App.tsx                           -- AuthProvider + QueryClientProvider
  main.tsx                          -- configureApi()
```
