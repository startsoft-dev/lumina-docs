# /add-react-crud -- Generate React CRUD Components for a Lumina Model

You are generating a complete set of React CRUD components for a Lumina model using `@startsoft/lumina` hooks.

## Step 1: Gather Information

Ask the user:

1. **Model name:** The API slug (e.g., `posts`, `blogs`, `invoices`)
2. **Display fields:** Which fields to show in the list view
3. **Form fields:** Which fields to include in create/edit forms, with their input types (text, textarea, number, select, checkbox, date, etc.)
4. **Relationships to include:** Which relationships to eager-load (for `includes`)
5. **Search fields:** Which fields to enable search on
6. **Filter fields:** Which fields to add filter controls for
7. **Routing pattern:** Are they using React Router, Next.js, or another router?
8. **Styling:** Tailwind CSS, plain CSS, or a component library?

## Step 2: Generate Files

### 1. TypeScript Interface

```typescript
// types/{model}.ts
export interface {ModelName} {
  id: number;
  // fields based on user input
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // relationship types
}
```

### 2. List Component

```tsx
// components/{model}/{ModelName}List.tsx
import { useState } from 'react';
import { useModelIndex } from '@startsoft/lumina';
import type { {ModelName} } from '../../types/{model}';

export function {ModelName}List() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data: response, isLoading, error } = useModelIndex<{ModelName}>('{slug}', {
    page,
    perPage: 20,
    search,
    includes: [/* relationships */],
    sort: '-created_at',
    // filters: { status: 'active' },
  });

  const items = response?.data || [];
  const pagination = response?.pagination;

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <div>
        <h1>{ModelName}s</h1>
        {/* Link to create page */}
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder="Search..."
      />

      {/* Filter controls */}

      <table>
        <thead>
          <tr>
            {/* Column headers for display fields */}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              {/* Display field values */}
              <td>
                {/* View/Edit/Delete action buttons */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pagination && (
        <div>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </button>
          <span>Page {pagination.currentPage} of {pagination.lastPage} ({pagination.total} total)</span>
          <button disabled={page >= pagination.lastPage} onClick={() => setPage(p => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

### 3. Detail Component

```tsx
// components/{model}/{ModelName}Detail.tsx
import { useModelShow } from '@startsoft/lumina';
import type { {ModelName} } from '../../types/{model}';

interface Props {
  id: number | string;
}

export function {ModelName}Detail({ id }: Props) {
  const { data: item, isLoading, error } = useModelShow<{ModelName}>('{slug}', id, {
    includes: [/* relationships */],
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!item) return <div>Not found</div>;

  return (
    <div>
      <h1>{/* Primary display field */}</h1>
      {/* All detail fields */}
      {/* Related data */}
      {/* Edit / Delete buttons */}
    </div>
  );
}
```

### 4. Create/Edit Form Component

```tsx
// components/{model}/{ModelName}Form.tsx
import { useState, useEffect } from 'react';
import { useModelStore, useModelUpdate, useModelShow } from '@startsoft/lumina';
import type { {ModelName} } from '../../types/{model}';

interface Props {
  id?: number | string; // If provided, edit mode; otherwise create mode
  onSuccess?: (item: {ModelName}) => void;
}

export function {ModelName}Form({ id, onSuccess }: Props) {
  const isEditing = !!id;

  // Load existing data for edit mode
  const { data: existing } = useModelShow<{ModelName}>('{slug}', id!, {
    enabled: isEditing,
  });

  const createMutation = useModelStore<{ModelName}>('{slug}');
  const updateMutation = useModelUpdate<{ModelName}>('{slug}');

  // Form state
  const [formData, setFormData] = useState({
    // Initialize with empty/default values for each form field
  });

  // Populate form when editing
  useEffect(() => {
    if (existing && isEditing) {
      setFormData({
        // Map existing data to form fields
      });
    }
  }, [existing, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing) {
      updateMutation.mutate(
        { id: id!, data: formData },
        {
          onSuccess: (updated) => onSuccess?.(updated),
          onError: (error) => alert('Error: ' + error.message),
        }
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: (created) => onSuccess?.(created),
        onError: (error) => alert('Error: ' + error.message),
      });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit}>
      <h2>{isEditing ? 'Edit' : 'Create'} {ModelName}</h2>

      {/* Form fields based on user input */}
      {/* Each field: label + input with value/onChange */}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
      </button>
    </form>
  );
}
```

### 5. Delete Button Component

```tsx
// components/{model}/{ModelName}DeleteButton.tsx
import { useModelDelete } from '@startsoft/lumina';

interface Props {
  id: number | string;
  onSuccess?: () => void;
}

export function {ModelName}DeleteButton({ id, onSuccess }: Props) {
  const deleteMutation = useModelDelete('{slug}');

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteMutation.mutate(id, {
        onSuccess: () => onSuccess?.(),
        onError: (error) => alert('Delete failed: ' + error.message),
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleteMutation.isPending}
    >
      {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
```

## Step 3: Summary

After generating, list all created files and remind the user:
- Import the components where needed in their routing setup
- The hooks automatically scope to the current organization
- Cache invalidation is handled automatically by the hooks
- Pagination metadata comes from response headers
- The `useModelStore` and `useModelUpdate` mutations automatically invalidate related queries
