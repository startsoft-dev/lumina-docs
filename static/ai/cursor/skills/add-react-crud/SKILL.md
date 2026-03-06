---
name: add-react-crud
description: Generates React CRUD components for a Lumina API resource using @startsoft/lumina hooks. Use this skill when you need to create frontend components for listing, viewing, creating, editing, and deleting records that connect to a Lumina backend.
---

# Add React CRUD

Generates a complete set of React components for a Lumina API resource using the `@startsoft/lumina` package hooks.

## Workflow

### Step 1: Gather Requirements

Ask the user:

> 1. What is the model name? (PascalCase, e.g., `BlogPost`)
> 2. What is the API slug? (snake_case plural, e.g., `blog_posts`)
> 3. What are the visible fields? (field name, type, label for display)
> 4. Which fields are in the create/edit form? (field name, input type, required?)
> 5. Does this model support soft deletes? (show trash/restore buttons?)
> 6. What relationships should be included in list/detail views? (e.g., `author`, `comments`)
> 7. Which fields are searchable?
> 8. Which fields are filterable? (with filter options)
> 9. Is this for React web or React Native?

### Step 2: Generate TypeScript Interface

Create `src/types/{modelName}.ts`:

```typescript
export interface {ModelName} {
  id: number;
  // Add all fields from the API response
  // title: string;
  // body: string;
  // is_published: boolean;
  // user_id: number;
  // organization_id: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface {ModelName}FormData {
  // Add all fields that can be submitted in create/edit forms
  // title: string;
  // body: string;
  // is_published: boolean;
}

export interface {ModelName}Filters {
  // Add all filterable fields
  // status?: string;
  // user_id?: number;
}
```

### Step 3: Create List Component

Create `src/components/{modelName}/{ModelName}List.tsx`:

```tsx
import React, { useState } from 'react';
import { useModelIndex } from '@startsoft/lumina';
import { {ModelName}, {ModelName}Filters } from '../../types/{modelName}';

export function {ModelName}List() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<{ModelName}Filters>({});
  const [sort, setSort] = useState('-created_at');
  const [page, setPage] = useState(1);

  const {
    data,
    isLoading,
    error,
    pagination,
    refetch,
  } = useModelIndex<{ModelName}>('{slug}', {
    search,
    filters,
    sort,
    page,
    perPage: 25,
    include: [/* relationships to include */],
    fields: { {slug}: [/* sparse fieldset */] },
  });

  if (isLoading) {
    return <div className="loading">Loading {modelName}s...</div>;
  }

  if (error) {
    if (error.status === 403) {
      return <div className="error">You do not have permission to view {modelName}s.</div>;
    }
    return <div className="error">Error loading {modelName}s: {error.message}</div>;
  }

  return (
    <div>
      <div className="header">
        <h1>{ModelName}s</h1>
        <a href="/{modelName}s/new">Create New</a>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      {/* Filters */}
      {/* Add filter controls based on filterable fields */}

      {/* Sort controls */}
      <select value={sort} onChange={(e) => setSort(e.target.value)}>
        <option value="-created_at">Newest first</option>
        <option value="created_at">Oldest first</option>
        {/* Add sort options per field */}
      </select>

      {/* Record list */}
      <table>
        <thead>
          <tr>
            {/* Column headers */}
          </tr>
        </thead>
        <tbody>
          {data?.map((item) => (
            <tr key={item.id}>
              {/* Column values */}
              <td>
                <a href={`/{modelName}s/${item.id}`}>View</a>
                <a href={`/{modelName}s/${item.id}/edit`}>Edit</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {pagination && (
        <div className="pagination">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>Page {pagination.current_page} of {pagination.last_page}</span>
          <button
            disabled={page >= pagination.last_page}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

### Step 4: Create Detail Component

Create `src/components/{modelName}/{ModelName}Detail.tsx`:

```tsx
import React from 'react';
import { useModelShow } from '@startsoft/lumina';
import { {ModelName} } from '../../types/{modelName}';
import { {ModelName}DeleteButton } from './{ModelName}DeleteButton';

interface {ModelName}DetailProps {
  id: number;
}

export function {ModelName}Detail({ id }: {ModelName}DetailProps) {
  const { data, isLoading, error, refetch } = useModelShow<{ModelName}>('{slug}', id, {
    include: [/* relationships to include */],
  });

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    if (error.status === 404) {
      return <div className="error">{ModelName} not found.</div>;
    }
    if (error.status === 403) {
      return <div className="error">You do not have permission to view this {modelName}.</div>;
    }
    return <div className="error">Error: {error.message}</div>;
  }

  if (!data) {
    return null;
  }

  return (
    <div>
      <div className="header">
        <h1>{/* Display title/name */}</h1>
        <div className="actions">
          <a href={`/{modelName}s/${id}/edit`}>Edit</a>
          <{ModelName}DeleteButton id={id} />
        </div>
      </div>

      <div className="details">
        {/* Display all visible fields */}
        {/* <p><strong>Title:</strong> {data.title}</p> */}
        {/* <p><strong>Created:</strong> {new Date(data.created_at).toLocaleDateString()}</p> */}
      </div>

      {/* Related records */}
      {/* {data.comments && <CommentList comments={data.comments} />} */}
    </div>
  );
}
```

### Step 5: Create Form Component

Create `src/components/{modelName}/{ModelName}Form.tsx`:

```tsx
import React, { useState } from 'react';
import { useModelStore, useModelUpdate, useModelShow } from '@startsoft/lumina';
import { {ModelName}, {ModelName}FormData } from '../../types/{modelName}';

interface {ModelName}FormProps {
  id?: number; // If provided, edit mode; otherwise, create mode
  onSuccess?: (record: {ModelName}) => void;
}

export function {ModelName}Form({ id, onSuccess }: {ModelName}FormProps) {
  const isEditMode = id !== undefined;

  // Load existing data for edit mode
  const { data: existing, isLoading: isLoadingExisting } = useModelShow<{ModelName}>(
    '{slug}',
    isEditMode ? id : 0,
    { enabled: isEditMode }
  );

  const { store, isLoading: isCreating, validationErrors: createErrors } = useModelStore('{slug}');
  const { update, isLoading: isUpdating, validationErrors: updateErrors } = useModelUpdate('{slug}', id);

  const [formData, setFormData] = useState<{ModelName}FormData>({
    // Initialize with default values
    // title: '',
    // body: '',
    // is_published: false,
  });

  // Update form data when existing record loads
  React.useEffect(() => {
    if (existing) {
      setFormData({
        // Map existing data to form fields
        // title: existing.title,
        // body: existing.body,
        // is_published: existing.is_published,
      });
    }
  }, [existing]);

  const validationErrors = isEditMode ? updateErrors : createErrors;
  const isSubmitting = isEditMode ? isUpdating : isCreating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let result: {ModelName};
      if (isEditMode) {
        result = await update(formData);
      } else {
        result = await store(formData);
      }
      onSuccess?.(result);
    } catch (error) {
      // validationErrors is automatically populated for 422 responses
      console.error('Submit failed:', error);
    }
  };

  const handleChange = (field: keyof {ModelName}FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isEditMode && isLoadingExisting) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>{isEditMode ? 'Edit' : 'Create'} {ModelName}</h1>

      {/* Form fields */}
      {/* Example text field: */}
      {/*
      <div className="field">
        <label htmlFor="title">Title *</label>
        <input
          id="title"
          type="text"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          required
        />
        {validationErrors?.title && (
          <span className="error">{validationErrors.title[0]}</span>
        )}
      </div>
      */}

      {/* Example boolean field: */}
      {/*
      <div className="field">
        <label>
          <input
            type="checkbox"
            checked={formData.is_published}
            onChange={(e) => handleChange('is_published', e.target.checked)}
          />
          Published
        </label>
      </div>
      */}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
      </button>
    </form>
  );
}
```

### Step 6: Create Delete Button Component

Create `src/components/{modelName}/{ModelName}DeleteButton.tsx`:

```tsx
import React, { useState } from 'react';
import { useModelDelete } from '@startsoft/lumina';

interface {ModelName}DeleteButtonProps {
  id: number;
  onDeleted?: () => void;
}

export function {ModelName}DeleteButton({ id, onDeleted }: {ModelName}DeleteButtonProps) {
  const { destroy, isLoading } = useModelDelete('{slug}', id);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    try {
      await destroy();
      onDeleted?.();
    } catch (error: any) {
      if (error.status === 403) {
        alert('You do not have permission to delete this record.');
      } else {
        alert('An error occurred while deleting.');
      }
    } finally {
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="confirm-delete">
        <span>Are you sure?</span>
        <button onClick={handleDelete} disabled={isLoading}>
          {isLoading ? 'Deleting...' : 'Yes, Delete'}
        </button>
        <button onClick={() => setShowConfirm(false)} disabled={isLoading}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setShowConfirm(true)} className="delete-button">
      Delete
    </button>
  );
}
```

### Step 7: Verify Checklist

- [ ] TypeScript interface matches the API response fields (including `created_at`, `updated_at`, `deleted_at`)
- [ ] `{ModelName}FormData` interface includes only fields that can be submitted
- [ ] List component uses `useModelIndex` with correct slug
- [ ] List component handles `isLoading`, `error` (including 403), and empty states
- [ ] List component supports search, filtering, sorting, and pagination
- [ ] Detail component uses `useModelShow` with correct slug and id
- [ ] Detail component handles 404 and 403 error states
- [ ] Form component uses `useModelStore` for create mode and `useModelUpdate` for edit mode
- [ ] Form component displays validation errors from 422 responses (`validationErrors`)
- [ ] Form component pre-populates fields in edit mode
- [ ] Delete button uses `useModelDelete` with correct slug and id
- [ ] Delete button has confirmation dialog before deleting
- [ ] Delete button handles 403 error (permission denied)
- [ ] All hooks reference the correct API slug (snake_case plural, e.g., `blog_posts`)
- [ ] All components import from `@startsoft/lumina`
