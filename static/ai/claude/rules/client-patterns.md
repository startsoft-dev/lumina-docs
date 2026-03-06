# Lumina Client Patterns Reference

Complete reference for all client-side hooks and utilities in `@startsoft/lumina`.

---

## Configuration

### configureApi()

Configure the API client before rendering the app.

```typescript
import { configureApi } from '@startsoft/lumina';

configureApi({
  baseURL: string,              // API base URL (e.g., import.meta.env.VITE_API_URL)
  onUnauthorized?: () => void,  // Callback on 401 responses (default: redirect to '/')
});
```

### AuthProvider

React context provider for authentication state. Must wrap the app.

```tsx
import { AuthProvider } from '@startsoft/lumina';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

<QueryClientProvider client={queryClient}>
  <AuthProvider>
    {children}
  </AuthProvider>
</QueryClientProvider>
```

---

## Authentication Hooks

### useAuth()

```typescript
import { useAuth } from '@startsoft/lumina';

function useAuth(): {
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  setOrganization: (slug: string) => void;
}

interface LoginResult {
  success: boolean;
  user?: any;
  organization?: { slug: string };
  organization_slug?: string;
  error?: string;
}
```

**Usage:**
```typescript
const { isAuthenticated, login, logout, setOrganization } = useAuth();

// Login
const result = await login('user@example.com', 'password');
if (result.success) {
  // result.organization_slug contains the first org slug
}

// Logout
await logout();

// Switch organization
setOrganization('acme-corp');
```

---

## Organization Hooks

### useOrganization()

Returns the current organization slug from URL params or localStorage.

```typescript
import { useOrganization } from '@startsoft/lumina';

function useOrganization(): string | null
```

### useOwner()

Fetches the current organization's full data.

```typescript
import { useOwner } from '@startsoft/lumina';

function useOwner(options?: {
  includes?: string[];
}): UseQueryResult<Organization>

interface Organization {
  id: number;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  users?: User[];
}
```

### useOrganizationExists()

Checks if an organization slug exists.

```typescript
import { useOrganizationExists } from '@startsoft/lumina';

function useOrganizationExists(slug: string): UseQueryResult<{ exists: boolean }>
```

---

## CRUD Hooks

### useModelIndex()

Fetch paginated list with filtering, sorting, search, and relationship loading.

```typescript
import { useModelIndex } from '@startsoft/lumina';

function useModelIndex<T = any>(
  model: string,
  options?: ModelQueryOptions
): UseQueryResult<QueryResponse<T>>

interface ModelQueryOptions {
  filters?: Record<string, any>;   // ?filter[field]=value
  includes?: string[];              // ?include=rel1,rel2
  sort?: string;                    // ?sort=-created_at (prefix - for desc)
  fields?: string[];                // ?fields=id,title
  search?: string;                  // ?search=term
  page?: number;                    // ?page=1
  perPage?: number;                 // ?per_page=20
  per_page?: number;                // alias for perPage
}

interface QueryResponse<T> {
  data: T[];
  pagination: PaginationMeta | null;
}

interface PaginationMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}
```

**API request:** `GET /api/{org}/{model}?filter[status]=active&include=author&sort=-created_at&search=term&page=1&per_page=20`

### useModelShow()

Fetch a single model by ID.

```typescript
import { useModelShow } from '@startsoft/lumina';

function useModelShow<T = any>(
  model: string,
  id: string | number,
  options?: {
    includes?: string[];
    fields?: string[];
  }
): UseQueryResult<T>
```

**API request:** `GET /api/{org}/{model}/{id}?include=author,comments`

### useModelStore()

Create a new model instance.

```typescript
import { useModelStore } from '@startsoft/lumina';

function useModelStore<T = any>(
  model: string
): UseMutationResult<T, Error, Record<string, any>>
```

**Usage:**
```typescript
const create = useModelStore('posts');
create.mutate({ title: 'New Post', content: '...' }, {
  onSuccess: (created) => console.log('Created:', created.id),
  onError: (error) => console.error(error.message),
});
```

**API request:** `POST /api/{org}/{model}` with JSON body
**Cache:** Automatically invalidates `useModelIndex` queries.

### useModelUpdate()

Update an existing model.

```typescript
import { useModelUpdate } from '@startsoft/lumina';

function useModelUpdate<T = any>(
  model: string
): UseMutationResult<T, Error, { id: string | number; data: Record<string, any> }>
```

**Usage:**
```typescript
const update = useModelUpdate('posts');
update.mutate({ id: 123, data: { title: 'Updated' } });
```

**API request:** `PUT /api/{org}/{model}/{id}` with JSON body
**Cache:** Invalidates both `useModelShow` and `useModelIndex` queries.

### useModelDelete()

Soft delete a model.

```typescript
import { useModelDelete } from '@startsoft/lumina';

function useModelDelete<T = any>(
  model: string
): UseMutationResult<T, Error, string | number>
```

**Usage:**
```typescript
const remove = useModelDelete('posts');
remove.mutate(postId);
```

**API request:** `DELETE /api/{org}/{model}/{id}`
**Cache:** Removes from index, invalidates show, appears in trashed.

---

## Soft Delete Hooks

### useModelTrashed()

Fetch soft-deleted models.

```typescript
import { useModelTrashed } from '@startsoft/lumina';

function useModelTrashed<T = any>(
  model: string,
  options?: ModelQueryOptions
): UseQueryResult<QueryResponse<T>>
```

**API request:** `GET /api/{org}/{model}/trashed`

### useModelRestore()

Restore a soft-deleted model.

```typescript
import { useModelRestore } from '@startsoft/lumina';

function useModelRestore<T = any>(
  model: string
): UseMutationResult<T, Error, string | number>
```

**API request:** `POST /api/{org}/{model}/{id}/restore`
**Cache:** Removes from trashed, adds back to index.

### useModelForceDelete()

Permanently delete a model (cannot be recovered).

```typescript
import { useModelForceDelete } from '@startsoft/lumina';

function useModelForceDelete<T = any>(
  model: string
): UseMutationResult<T, Error, string | number>
```

**API request:** `DELETE /api/{org}/{model}/{id}/force`
**Cache:** Removes from all queries permanently.

---

## Advanced Hooks

### useNestedOperations()

Execute multiple CRUD operations in a single atomic transaction.

```typescript
import { useNestedOperations } from '@startsoft/lumina';

function useNestedOperations(): UseMutationResult<
  any,
  Error,
  { operations: NestedOperation[] }
>

interface NestedOperation {
  action: 'create' | 'update' | 'delete';
  model: string;
  id?: string | number;         // required for update/delete
  data?: Record<string, any>;   // required for create/update
}
```

**Reference syntax:** Use `$N.field` to reference results from previous operations:
- `$0.id` -- ID from first operation
- `$1.slug` -- slug from second operation

**API request:** `POST /api/{org}/nested-operations` with `{ operations: [...] }`

### useModelAudit()

Fetch audit trail for a model instance.

```typescript
import { useModelAudit } from '@startsoft/lumina';

function useModelAudit<T = AuditLog>(
  model: string,
  id: string | number,
  options?: { page?: number; perPage?: number }
): UseQueryResult<QueryResponse<T>>

interface AuditLog {
  id: number;
  action: string;         // 'created', 'updated', 'deleted', 'restored', 'force_deleted'
  user_id: number;
  model_type: string;
  model_id: number;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  created_at: string;
}
```

**API request:** `GET /api/{org}/{model}/{id}/audit`

---

## Invitation Hooks

### useInvitations()

List organization invitations.

```typescript
import { useInvitations } from '@startsoft/lumina';

function useInvitations(options?: {
  status?: InvitationStatus;
  page?: number;
  perPage?: number;
}): UseQueryResult<QueryResponse<Invitation>>

type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

interface Invitation {
  id: number;
  email: string;
  role_id: number;
  role?: { id: number; name: string };
  status: InvitationStatus;
  invited_by?: { id: number; name: string };
  expires_at: string;
  created_at: string;
  updated_at: string;
}
```

### useInviteUser()

Create a new invitation.

```typescript
import { useInviteUser } from '@startsoft/lumina';

function useInviteUser(): UseMutationResult<
  Invitation,
  Error,
  { email: string; role_id: number }
>
```

### useResendInvitation()

Resend a pending invitation.

```typescript
import { useResendInvitation } from '@startsoft/lumina';

function useResendInvitation(): UseMutationResult<Invitation, Error, number>
```

### useCancelInvitation()

Cancel a pending invitation.

```typescript
import { useCancelInvitation } from '@startsoft/lumina';

function useCancelInvitation(): UseMutationResult<Invitation, Error, number>
```

### useAcceptInvitation()

Accept an invitation and join the organization.

```typescript
import { useAcceptInvitation } from '@startsoft/lumina';

function useAcceptInvitation(): UseMutationResult<
  { user: User; organization: Organization },
  Error,
  { token: string; password?: string }
>
```

---

## Utility Exports

### api

Pre-configured Axios instance with auth token and organization interceptors.

```typescript
import { api } from '@startsoft/lumina';

const response = await api.get('/custom/endpoint');
const response = await api.post('/custom/resource', data);
```

**Interceptors:**
- Request: attaches `Authorization: Bearer {token}` from storage
- Response: handles 401 (calls `onUnauthorized`), CORS errors

### storage

Platform-agnostic storage adapter (localStorage on web).

```typescript
import { storage, createWebStorage } from '@startsoft/lumina';

storage.getItem('key');
storage.setItem('key', 'value');
storage.removeItem('key');
```

### events

Simple event emitter for cross-component communication.

```typescript
import { events, createWebEvents } from '@startsoft/lumina';

events.emit('organization_slug', 'acme-corp');
events.on('organization_slug', (slug) => { ... });
```

### extractPaginationFromHeaders()

Extract pagination metadata from API response headers.

```typescript
import { extractPaginationFromHeaders } from '@startsoft/lumina';

function extractPaginationFromHeaders(response: AxiosResponse): PaginationMeta | null
```

**Headers parsed:**
- `X-Current-Page` -> `currentPage`
- `X-Last-Page` -> `lastPage`
- `X-Per-Page` -> `perPage`
- `X-Total` -> `total`

### cn()

Class name merging utility (clsx + tailwind-merge).

```typescript
import { cn } from '@startsoft/lumina';

cn('px-4 py-2', isActive && 'bg-blue-500', className)
```

---

## TypeScript Types

All types exported from the main package:

```typescript
import type {
  PaginationMeta,
  ModelQueryOptions,
  NestedOperation,
  AuditLog,
  LoginResult,
  QueryResponse,
  InvitationStatus,
  Invitation,
  Organization,
  User,
  Role,
} from '@startsoft/lumina';
```

---

## Common Patterns

### List with Search and Pagination

```tsx
const [page, setPage] = useState(1);
const [search, setSearch] = useState('');
const { data: response, isLoading } = useModelIndex('posts', {
  page, perPage: 20, search, sort: '-created_at',
});
const items = response?.data || [];
const pagination = response?.pagination;
```

### Create/Edit Form

```tsx
const isEditing = !!id;
const { data: existing } = useModelShow('posts', id!, { enabled: isEditing });
const create = useModelStore('posts');
const update = useModelUpdate('posts');

const handleSubmit = () => {
  if (isEditing) {
    update.mutate({ id, data: formData });
  } else {
    create.mutate(formData);
  }
};
```

### Soft Delete Workflow

```tsx
const remove = useModelDelete('posts');
const { data: trashed } = useModelTrashed('posts');
const restore = useModelRestore('posts');
const forceDelete = useModelForceDelete('posts');
```

### Protected Route

```tsx
const { isAuthenticated } = useAuth();
if (!isAuthenticated) return <Navigate to="/login" />;
```
