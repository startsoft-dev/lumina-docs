# /verify-model -- Verify Lumina Model Configuration

You are running a verification checklist on a Lumina model to ensure it is correctly configured for the automatic REST API.

## Step 1: Identify the Model

If no model name is provided, ask for it. Read the following files:
- `app/Models/{ModelName}.php`
- `app/Policies/{ModelName}Policy.php` (if it exists)
- `app/Models/Scopes/{ModelName}Scope.php` (if it exists)
- `config/lumina.php`
- The migration file for the model's table (search in `database/migrations/`)
- `database/factories/{ModelName}Factory.php` (if it exists)

## Step 2: Run Checks

For each check, report PASS, MISSING, or INCORRECT with details.

### Trait Checks

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 1 | `HasFactory` trait | Present in `use` statement | |
| 2 | `SoftDeletes` trait | Present in `use` statement | |
| 3 | `HasValidation` trait | `Lumina\LaravelApi\Traits\HasValidation` | |
| 4 | `HidableColumns` trait | `Lumina\LaravelApi\Traits\HidableColumns` | |
| 5 | `BelongsToOrganization` trait (if model has `organization_id` in `$fillable`) | `Lumina\LaravelApi\Traits\BelongsToOrganization` | |

### Property Checks

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 6 | `$fillable` | Non-empty array | |
| 7 | `$validationRules` | Non-empty array with rules for fillable fields | |
| 8 | `$validationRulesStore` | Defined (array of field names or role-keyed array) | |
| 9 | `$validationRulesUpdate` | Defined (array of field names or role-keyed array) | |
| 10 | `$allowedFilters` | Static property, array | |
| 11 | `$allowedSorts` | Static property, array | |
| 12 | `$defaultSort` | Static property, string (e.g., `-created_at`) | |
| 13 | `$allowedFields` | Static property, array (should include `id`) | |
| 14 | `$allowedIncludes` | Static property, array | |
| 15 | `$allowedSearch` | Static property, array | |

### Multi-Tenancy Checks

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 16 | Tenancy strategy | Either `BelongsToOrganization` trait (direct) OR auto-detected indirect path OR non-tenant | |
| 17 | If `BelongsToOrganization`: `organization_id` in `$fillable` | Present | |

### Policy Checks

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 19 | Policy file exists | `app/Policies/{ModelName}Policy.php` | |
| 20 | Extends `ResourcePolicy` | `extends Lumina\LaravelApi\Policies\ResourcePolicy` | |
| 21 | `hiddenColumns()` method | Defined if role-based column hiding is needed | |

### Scope Checks

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 22 | Scope file exists (if role-based filtering needed) | `app/Models/Scopes/{ModelName}Scope.php` | |
| 23 | Scope implements `Scope` interface | `implements Illuminate\Database\Eloquent\Scope` | |
| 24 | Scope registered in model | Via `booted()` or `HasAutoScope` trait | |

### Config Checks

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 25 | Registered in `config/lumina.php` | Model class listed under `models` key | |
| 26 | Slug matches expected convention | snake_case plural (e.g., `blog_posts`) | |

### Other Checks

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 27 | Migration exists | `create_{table}_table` migration with `softDeletes()` | |
| 28 | Migration has `softDeletes()` | Column exists in migration | |
| 29 | Factory exists | `database/factories/{ModelName}Factory.php` | |

### Validation Consistency Checks

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 30 | Store fields reference valid `$validationRules` keys | All field names in store rules exist in base rules | |
| 31 | Update fields reference valid `$validationRules` keys | All field names in update rules exist in base rules | |
| 32 | Role-based format consistency | Not mixing simple and role-based formats in same array | |

## Step 3: Output Summary

Present the results as a table with PASS/MISSING/INCORRECT status for each check. At the end, provide:
- Total passed
- Total issues found
- Specific remediation steps for each MISSING or INCORRECT item
