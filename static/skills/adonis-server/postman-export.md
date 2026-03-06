# Lumina AdonisJS Server — Postman Export (Skill)

You are a senior software engineer specialized in **Lumina**, an AdonisJS package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **AdonisJS (TypeScript)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's Postman collection export command: `node ace lumina:export-postman`, command flags (`--output`, `--base-url`, `--project-name`), configuration options, the generated collection structure (authentication folder, per-model folders, collection variables), example request bodies generated from VineJS validation schemas, and multi-tenant support with organization variables.

---

## Documentation

### Usage

Generate a Postman Collection v2.1 JSON file for all registered models:

```bash
node ace lumina:export-postman
```

This starts the AdonisJS application, introspects all registered models from `config/lumina.ts`, and writes a `postman_collection.json` file.

### Command Flags

| Flag | Alias | Default | Description |
|------|-------|---------|-------------|
| `--output` | | `postman_collection.json` | Output file path |
| `--base-url` | `-b` | `http://localhost:3333/api` | Base URL for requests |
| `--project-name` | `-p` | Config value or `'Lumina API'` | Collection name |

### Examples

```bash
# Default output
node ace lumina:export-postman

# Custom output path and base URL
node ace lumina:export-postman --output api-collection.json --base-url https://api.example.com

# Custom collection name
node ace lumina:export-postman -p "My Project API"
```

### Configuration

The Postman export reads default values from `config/lumina.ts`:

```ts
// config/lumina.ts
import { defineConfig } from '@startsoft/lumina-adonis'

export default defineConfig({
  postman: {
    baseUrl: '{{baseUrl}}/api',
    collectionName: 'Lumina API',
  },
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | `'{{baseUrl}}/api'` | The base URL used in generated requests. Supports Postman variables like `{{baseUrl}}` |
| `collectionName` | `string` | `'Lumina API'` | The name of the generated Postman collection |

Command-line flags override config values when provided.

### Generated Collection Structure

The exported collection is organized into folders:

#### Collection Variables

The collection includes pre-defined variables that can be customized in Postman:

| Variable | Default Value | Description |
|----------|--------------|-------------|
| `baseUrl` | From config | Base URL for all requests |
| `modelId` | `1` | Example resource ID |
| `token` | (empty) | Auth token, auto-filled by the Login request |
| `organization` | `organization-1` | Organization identifier (only when multi-tenant with URL prefix) |

#### Authentication Folder

A top-level `Authentication` folder containing:

- **Login** -- `POST /auth/login` with test script that auto-saves the returned token to the `{{token}}` collection variable
- **Logout** -- `POST /auth/logout`
- **Password recover** -- `POST /auth/password/recover`
- **Password reset** -- `POST /auth/password/reset`
- **Register (with invitation)** -- `POST /auth/register`
- **Accept invitation** -- `POST /invitations/accept`

#### Per-Model Folders

Each registered model gets its own folder with sub-folders for each action. The command introspects the model's static properties (`$allowedFilters`, `$allowedSorts`, `$allowedIncludes`, `$allowedFields`, `$allowedSearch`, `$validationSchema`, `$exceptActions`, `$softDeletes`) to generate accurate example requests.

**Index sub-folder:**
- List all
- Filter by each allowed filter (one request per filter)
- Sort by each allowed sort (ascending and descending)
- Include each allowed relationship
- Include all relationships at once
- Select fields
- Search (if search fields are configured)
- Paginate
- Combined request (filter + sort + include + fields + pagination)

**Show sub-folder:**
- Show by ID
- Show with include
- Show with fields

**Store sub-folder:**
- Create with example body generated from validation rules

**Update sub-folder:**
- Update all fields
- Update partial (first field only)

**Destroy sub-folder:**
- Delete by ID

**Soft-delete sub-folders** (when `$softDeletes = true`):
- **Trashed** -- List trashed, List trashed with sort
- **Restore** -- Restore by ID
- **Force Delete** -- Force delete by ID

### Example Request Bodies

The command generates example request bodies from the model's `$validationSchema` property. Field values are inferred from the schema types:

| Schema Type | Example Value |
|------|--------------|
| `vine.boolean()` | `true` |
| `vine.number()` | `1` |
| `vine.string().maxLength(N)` | String of `min(10, N)` characters |
| `vine.string()` | `"Example fieldName"` |

For example, a model with this schema:

```ts
static $validationSchema = {
  title: vine.string().maxLength(255),
  content: vine.string(),
  is_published: vine.boolean(),
  category_id: vine.number(),
}
```

Generates this example body:

```json
{
  "title": "Example ti",
  "content": "Example content",
  "is_published": true,
  "category_id": 1
}
```

### Multi-Tenant Support

When multi-tenancy is enabled with URL prefix mode, all model routes include the `{{organization}}` variable:

```
GET {{baseUrl}}/{{organization}}/posts
POST {{baseUrl}}/{{organization}}/posts
GET {{baseUrl}}/{{organization}}/posts/{{modelId}}
PUT {{baseUrl}}/{{organization}}/posts/{{modelId}}
DELETE {{baseUrl}}/{{organization}}/posts/{{modelId}}
```

The `organization` collection variable is included automatically with a default value of `organization-1`.

### Importing the Collection

1. Run `node ace lumina:export-postman`
2. Open Postman
3. Click **Import** and select the generated `postman_collection.json`
4. Update the `baseUrl` variable to match your environment
5. Run the **Login** request first to populate the `{{token}}` variable
6. All subsequent requests will use the saved token automatically

---

## Frequently Asked Questions

**Q: How do I generate a Postman collection for my Lumina API?**

A: Run the export command:

```bash
node ace lumina:export-postman
```

This creates a `postman_collection.json` file in your project root. Import it into Postman.

**Q: How do I customize the output file path and base URL?**

A: Use command flags:

```bash
node ace lumina:export-postman --output my-api.json --base-url https://api.example.com -p "My API"
```

Or set defaults in `config/lumina.ts`:

```ts
postman: {
  baseUrl: '{{baseUrl}}/api',
  collectionName: 'My API',
},
```

**Q: How does the Login request auto-save the token?**

A: The generated Login request includes a Postman test script that extracts the token from the response and saves it to the `{{token}}` collection variable. All other requests use `Bearer {{token}}` in the Authorization header, so running Login first populates the token for the entire collection.

**Q: Are soft-delete endpoints included?**

A: Yes, but only for models that have `static $softDeletes = true`. These models get additional sub-folders for Trashed (list trashed records), Restore (restore by ID), and Force Delete (permanently delete by ID).

**Q: How does the exporter handle multi-tenant routes?**

A: When a `tenant` route group with a URL prefix is configured, all model routes include the `{{organization}}` Postman variable in the URL. An `organization` collection variable is added with a default value of `organization-1`. You can change this in Postman to match your test organization.

**Q: What if my model excludes certain CRUD actions?**

A: The exporter reads the model's `$exceptActions` property and skips generating requests for excluded actions. For example, if a model has `static $exceptActions = ['destroy']`, the Destroy sub-folder is omitted.

**Q: How are example request bodies generated?**

A: The exporter reads the model's `$validationSchema` property and generates example values based on VineJS schema types. Strings get example text, numbers get `1`, booleans get `true`, etc.

---

## Real-World Examples

### Exporting a Collection for a Multi-Tenant SaaS App

```bash
# config/lumina.ts has:
# routeGroups: { tenant: { prefix: ':organization', ... } }
# models: { posts, comments, tags, categories }
# postman: { baseUrl: '{{baseUrl}}/api', collectionName: 'SaaS API' }

node ace lumina:export-postman

# Output: postman_collection.json
# Collection structure:
#   Authentication/
#     Login
#     Logout
#     Password recover
#     Password reset
#     Register (with invitation)
#     Accept invitation
#   Posts/
#     Index/
#       List all               GET {{baseUrl}}/{{organization}}/posts
#       Filter by title         GET {{baseUrl}}/{{organization}}/posts?filter[title]=...
#       Sort by created_at     GET {{baseUrl}}/{{organization}}/posts?sort=-created_at
#       Include comments       GET {{baseUrl}}/{{organization}}/posts?include=comments
#       ...
#     Show/
#       Show by ID             GET {{baseUrl}}/{{organization}}/posts/{{modelId}}
#     Store/
#       Create                 POST {{baseUrl}}/{{organization}}/posts
#     Update/
#       Update all fields      PUT {{baseUrl}}/{{organization}}/posts/{{modelId}}
#     Destroy/
#       Delete                 DELETE {{baseUrl}}/{{organization}}/posts/{{modelId}}
#   Comments/
#     ...
#   Tags/
#     ...
#   Categories/
#     ...
```

### Exporting for a Staging Environment

```bash
node ace lumina:export-postman \
  --output staging-collection.json \
  --base-url https://staging-api.myapp.com/api \
  -p "MyApp Staging API"
```

### Using Postman Variables for Multiple Environments

Configure the collection to use Postman variables for environment flexibility:

```ts
// config/lumina.ts
postman: {
  baseUrl: '{{baseUrl}}/api',
  collectionName: 'MyApp API',
},
```

Then in Postman, create environments:

| Environment | `baseUrl` |
|-------------|-----------|
| Local | `http://localhost:3333` |
| Staging | `https://staging-api.myapp.com` |
| Production | `https://api.myapp.com` |

Switching environments in Postman automatically updates all request URLs in the collection.
