# /full-scaffold -- Full-Stack Scaffold for a Lumina Resource

You are creating a complete full-stack scaffold for a new Lumina resource -- both server (Laravel) and client (React) code. This combines the `/add-model` and `/add-react-crud` workflows.

## Step 1: Gather All Information Up Front

Ask the user for everything needed in a single conversation:

**Model basics:**
- Model name (e.g., `Invoice`, `Project`, `Task`)
- Fields with types (e.g., `title:string`, `amount:decimal(10,2)`, `status:enum(draft,sent,paid)`, `due_date:date`)
- Organization relationship: direct (`organization_id`), indirect (auto-detected from BelongsTo relationships), or none

**Relationships:**
- `belongsTo`, `hasMany`, `hasOne`, `belongsToMany` relationships
- Which to expose as `$allowedIncludes`

**Authorization:**
- CRUD permissions per role (admin, editor, viewer, *)
- Hidden columns per role
- Data filtering per role (scope)

**Client specifics:**
- Display fields for list view
- Form fields with input types
- Search/filter fields
- Styling approach (Tailwind, plain CSS, etc.)

## Step 2: Generate Server Files

Generate all server files in this order:

### 1. Migration
```
database/migrations/{timestamp}_create_{table}_table.php
```
Include all fields, foreign keys, `timestamps()`, `softDeletes()`. Add `organization_id` with foreign key constraint if direct tenant.

### 2. Model
```
app/Models/{ModelName}.php
```
Include all required traits (`HasFactory`, `SoftDeletes`, `HasValidation`, `HidableColumns`, optionally `BelongsToOrganization`, `HasAuditTrail`). Define all properties: `$fillable`, `$validationRules`, `$validationRulesStore`, `$validationRulesUpdate`, `$allowedFilters`, `$allowedSorts`, `$defaultSort`, `$allowedFields`, `$allowedIncludes`, `$allowedSearch`. Indirect tenancy is auto-detected from BelongsTo relationships. Define all relationship methods.

### 3. Policy
```
app/Policies/{ModelName}Policy.php
```
Extend `ResourcePolicy`. Override methods only where custom logic is needed beyond the permission engine. Implement `hiddenColumns()` for role-based column visibility.

### 4. Scope (if needed)
```
app/Models/Scopes/{ModelName}Scope.php
```
Implement role-based data filtering. Register in the model's `booted()` method.

### 5. Factory
```
database/factories/{ModelName}Factory.php
```
Generate realistic faker data for all fields.

### 6. Config Registration
Add entry to `config/lumina.php` under `models` key.

## Step 3: Generate Client Files

### 1. TypeScript Interface
```
types/{model}.ts
```

### 2. List Component
```
components/{model}/{ModelName}List.tsx
```
Uses `useModelIndex` with search, filters, pagination, and sorting. Renders a table/list of records with action buttons.

### 3. Detail Component
```
components/{model}/{ModelName}Detail.tsx
```
Uses `useModelShow` with relationship includes. Displays all fields and related data.

### 4. Form Component
```
components/{model}/{ModelName}Form.tsx
```
Handles both create (`useModelStore`) and edit (`useModelUpdate`) modes. Includes form validation and loading states.

### 5. Delete Button
```
components/{model}/{ModelName}DeleteButton.tsx
```
Uses `useModelDelete` with confirmation dialog.

## Step 4: Verification

Run the verification checklist from `/verify-model` on the generated server code.

Then present a summary:

```
SERVER FILES CREATED:
  - database/migrations/{timestamp}_create_{table}_table.php
  - app/Models/{ModelName}.php
  - app/Policies/{ModelName}Policy.php
  - app/Models/Scopes/{ModelName}Scope.php (if applicable)
  - database/factories/{ModelName}Factory.php
  - config/lumina.php (updated)

CLIENT FILES CREATED:
  - types/{model}.ts
  - components/{model}/{ModelName}List.tsx
  - components/{model}/{ModelName}Detail.tsx
  - components/{model}/{ModelName}Form.tsx
  - components/{model}/{ModelName}DeleteButton.tsx

NEXT STEPS:
  1. Run migration: php artisan migrate
  2. Add routes to your React router for list/detail/create/edit pages
  3. Test the API endpoints: GET /api/{org}/{slug}
  4. Seed test data using the factory (optional)
```

## Important Notes

- Always use the Lumina conventions (traits, properties, patterns) documented in CLAUDE.md
- The server model drives the API; the client components consume it
- All hooks auto-scope to the current organization
- Cache invalidation is handled automatically by mutation hooks
- Ensure the model slug in `config/lumina.php` matches the slug used in client hooks
