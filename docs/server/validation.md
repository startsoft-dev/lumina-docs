---
sidebar_position: 3
title: Validation
---

# Validation

Lumina automatically validates incoming request data on `store` and `update` endpoints using rules you define directly on your model. The validation system supports base rules, per-action rules, presence modifiers, role-based field access, and custom error messages -- all without writing a single controller or form request class.

## How Validation Works

Models opt into validation by using the `HasValidation` trait. You then define your rules using a combination of four properties:

| Property                    | Purpose                                                |
|-----------------------------|--------------------------------------------------------|
| `$validationRules`          | Base rules for all fields                              |
| `$validationRulesStore`     | Fields and rules applied on `POST` (create)            |
| `$validationRulesUpdate`    | Fields and rules applied on `PUT`/`PATCH` (update)     |
| `$validationRulesMessages`  | Custom error messages for any rule                     |

When a request hits a `store` or `update` endpoint, Lumina:

1. Loads the base rules from `$validationRules`
2. Merges the action-specific rules (`$validationRulesStore` or `$validationRulesUpdate`)
3. Resolves the user's role (if role-based rules are defined)
4. Validates the request data against the combined ruleset
5. On failure, returns a `422` response with field-level errors
6. On success, proceeds with the operation using only the validated fields

```php
use Illuminate\Database\Eloquent\Model;
use Lumina\LaravelApi\Traits\HasValidation;

class Post extends Model
{
    use HasValidation;

    protected $validationRules = [ /* ... */ ];
    protected $validationRulesStore = [ /* ... */ ];
    protected $validationRulesUpdate = [ /* ... */ ];
    protected $validationRulesMessages = [ /* ... */ ];
}
```

:::info
Validation runs automatically. You do not need to call any validation method yourself -- Lumina intercepts the request before the data reaches your model.
:::

## Base Rules (`$validationRules`)

Base rules define the validation constraints for **all** fields on the model. These rules serve as the foundation that store and update rules reference and build upon.

```php
protected $validationRules = [
    'title'        => 'string|max:255',
    'content'      => 'string',
    'status'       => 'string|in:draft,published,archived',
    'user_id'      => 'integer|exists:users,id',
    'is_published' => 'boolean',
    'featured'     => 'boolean',
    'published_at' => 'date',
    'tags'         => 'array',
    'tags.*'       => 'string|max:50',
];
```

Any standard Laravel validation rule works here: `email`, `unique`, `exists`, `image`, `json`, `min`, `max`, `regex`, and so on.

:::tip
Keep base rules focused on **type and format constraints** (e.g., `string|max:255`). Leave presence requirements (`required`, `nullable`, `sometimes`) to the store and update rules, since those typically differ between creating and updating.
:::

## Simple Format (Field Names Only)

The simplest way to define store or update rules is to list which fields are allowed. Lumina applies the corresponding base rules automatically.

```php
// Only 'title' and 'content' are accepted on store
protected $validationRulesStore = ['title', 'content'];

// 'title', 'content', and 'status' are accepted on update
protected $validationRulesUpdate = ['title', 'content', 'status'];
```

In this example, when a `POST` request comes in, only `title` and `content` are validated and accepted. Even if the request includes `status`, `user_id`, or any other field, those are silently ignored because they are not listed.

:::warning
Fields **not listed** in `$validationRulesStore` or `$validationRulesUpdate` are silently ignored. The request will not fail, but those fields will never reach your model. This is by design -- it acts as an implicit allowlist.
:::

## Presence Modifiers

When using the associative format for store or update rules, you can prepend a **presence modifier** to control whether a field is required, optional, or conditionally validated.

```php
protected $validationRulesStore = [
    'title'   => 'required',    // Prepended to base rule: "required|string|max:255"
    'content' => 'nullable',    // Prepended to base rule: "nullable|string"
    'status'  => 'sometimes',   // Prepended to base rule: "sometimes|string|in:draft,published,archived"
];
```

The three presence modifiers are:

| Modifier     | Behavior                                                        |
|--------------|-----------------------------------------------------------------|
| `required`   | The field **must** be present and non-empty                     |
| `nullable`   | The field is accepted but may be `null`                         |
| `sometimes`  | The field is only validated **if it is present** in the request |

When the value is a single word matching one of these modifiers, Lumina **prepends** it to the base rule. The final rule for `title` above becomes `required|string|max:255`.

### Full Override

If the value contains a pipe character (`|`), it **completely overrides** the base rule instead of prepending:

```php
protected $validationRulesStore = [
    'title' => 'required|string|min:10|max:100',  // Full override -- base rule is ignored
];
```

Here, `title` will be validated as `required|string|min:10|max:100` and the base rule `string|max:255` is not used at all.

:::tip
Use the prepend format (`'required'`, `'nullable'`, `'sometimes'`) to keep your rules DRY. Use the full override format only when the store or update rule genuinely differs from the base rule in type or constraints.
:::

## Role-Based Validation

**This is the most powerful feature of the validation system.** Different user roles can submit different fields, giving you fine-grained control over who can set what.

The format uses role slugs as keys in the store and update arrays:

```php
protected $validationRules = [
    'title'        => 'string|max:255',
    'content'      => 'string',
    'status'       => 'string|in:draft,published,archived',
    'is_published' => 'boolean',
    'featured'     => 'boolean',
    'category_id'  => 'integer|exists:categories,id',
];

protected $validationRulesStore = [
    // Admins can set everything
    'admin' => [
        'title'        => 'required',
        'content'      => 'required',
        'status'       => 'nullable',
        'is_published' => 'nullable',
        'featured'     => 'nullable',
        'category_id'  => 'nullable',
    ],

    // Editors can set title and content, but not publishing fields
    'editor' => [
        'title'   => 'required',
        'content' => 'required',
    ],

    // Wildcard fallback -- any other role
    '*' => [
        'title'   => 'required',
        'content' => 'required',
    ],
];

protected $validationRulesUpdate = [
    'admin' => [
        'title'        => 'sometimes',
        'content'      => 'sometimes',
        'status'       => 'sometimes',
        'is_published' => 'sometimes',
        'featured'     => 'sometimes',
        'category_id'  => 'sometimes',
    ],
    'editor' => [
        'title'   => 'sometimes',
        'content' => 'sometimes',
    ],
    '*' => [
        'title' => 'sometimes',
    ],
];
```

Key behaviors:

- **Each role only sees the fields listed.** If `editor` sends `is_published: true` in the request body, that field is silently ignored because it is not in the editor's rule set.
- **The `*` wildcard** is a fallback that catches any role not explicitly defined. If a user has the role `viewer` and there is no `viewer` key, the `*` rules apply.
- **Admins get full access** to all fields, including sensitive publishing controls like `is_published` and `featured`.
- **Editors are restricted** -- they can write content but cannot control publication status.

:::warning
Unlisted fields are **silently ignored**, not rejected. This means an editor sending `{ "title": "Hello", "is_published": true }` will succeed -- but only `title` is saved. The `is_published` field is quietly dropped. This is intentional: it prevents information leakage about which fields exist while still enforcing access control.
:::

### How Role Resolution Works

For role-based validation to function, your `User` model must implement the `HasRoleBasedValidation` contract and define the `getRoleSlugForValidation($organization)` method:

```php
use Lumina\LaravelApi\Contracts\HasRoleBasedValidation;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable implements HasRoleBasedValidation
{
    use HasPermissions;

    public function getRoleSlugForValidation($organization): ?string
    {
        // Get the user's role for this organization
        $userRole = $this->userRoles()
            ->where('organization_id', $organization->id)
            ->first();

        return $userRole?->role?->slug;  // e.g. 'admin', 'editor', 'viewer'
    }
}
```

:::info
The `$organization` parameter is the resolved organization context from [multi-tenancy](/docs/server/multi-tenancy). This allows users to have different roles in different organizations. If your application does not use multi-tenancy, the parameter may be `null` -- handle that case in your implementation.
:::

The resolution flow is:

1. Lumina detects that the store/update rules use role-based keys (associative array of arrays).
2. It calls `getRoleSlugForValidation($organization)` on the authenticated user.
3. It looks up the returned slug (e.g., `'editor'`) in the rules array.
4. If the slug is not found, it falls back to the `'*'` wildcard.
5. If neither the slug nor `'*'` exists, validation fails with an authorization error.

## Custom Error Messages

Define custom messages using the standard Laravel `field.rule` format:

```php
protected $validationRulesMessages = [
    'title.required'   => 'Every post needs a title.',
    'title.max'        => 'Title cannot exceed 255 characters.',
    'status.in'        => 'Status must be draft, published, or archived.',
    'content.required' => 'Please provide content for the post.',
];
```

These messages apply to both store and update actions. They follow the exact same syntax as [Laravel's custom validation messages](https://laravel.com/docs/validation#custom-error-messages).

:::tip
Define messages for the rules most likely to fail -- especially `required` and format rules like `in`, `email`, and `max`. This makes your API much friendlier for frontend developers consuming the error responses.
:::

## Error Response Format

When validation fails, the API returns a `422 Unprocessable Entity` response with field-level errors:

```json
{
    "errors": {
        "title": ["Every post needs a title."],
        "status": ["Status must be draft, published, or archived."]
    }
}
```

Each key in the `errors` object corresponds to a field name, and the value is an array of error messages for that field. A single field can have multiple errors if it violates more than one rule.

## Complete Real-World Example

Here is a full `Post` model with role-based validation for three roles: **admin**, **editor**, and **author** (using the `*` wildcard as the author fallback).

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Lumina\LaravelApi\Traits\HasValidation;

class Post extends Model
{
    use HasValidation;

    // -------------------------------------------------------
    // Base rules: type and format constraints for every field
    // -------------------------------------------------------
    protected $validationRules = [
        'title'        => 'string|max:255',
        'content'      => 'string',
        'excerpt'      => 'string|max:500',
        'status'       => 'string|in:draft,published,archived',
        'category_id'  => 'integer|exists:categories,id',
        'is_published' => 'boolean',
        'featured'     => 'boolean',
        'is_pinned'    => 'boolean',
        'published_at' => 'date',
        'tags'         => 'array',
        'tags.*'       => 'string|max:50',
    ];

    // -------------------------------------------------------
    // Store rules: what each role can submit when creating
    // -------------------------------------------------------
    protected $validationRulesStore = [
        // Admin: full access to all fields
        'admin' => [
            'title'        => 'required',
            'content'      => 'required',
            'excerpt'      => 'nullable',
            'status'       => 'nullable',
            'category_id'  => 'nullable',
            'is_published' => 'nullable',
            'featured'     => 'nullable',
            'is_pinned'    => 'nullable',
            'published_at' => 'nullable',
            'tags'         => 'nullable',
            'tags.*'       => 'nullable',
        ],

        // Editor: content fields and category, but no publishing controls
        'editor' => [
            'title'       => 'required',
            'content'     => 'required',
            'excerpt'     => 'nullable',
            'category_id' => 'nullable',
        ],

        // Author (wildcard): can only write title and content
        '*' => [
            'title'   => 'required',
            'content' => 'required',
        ],
    ];

    // -------------------------------------------------------
    // Update rules: what each role can modify after creation
    // -------------------------------------------------------
    protected $validationRulesUpdate = [
        // Admin: can update every field
        'admin' => [
            'title'        => 'sometimes',
            'content'      => 'sometimes',
            'excerpt'      => 'sometimes',
            'status'       => 'sometimes',
            'category_id'  => 'sometimes',
            'is_published' => 'sometimes',
            'featured'     => 'sometimes',
            'is_pinned'    => 'sometimes',
            'published_at' => 'sometimes',
            'tags'         => 'sometimes',
            'tags.*'       => 'sometimes',
        ],

        // Editor: can update content fields and category
        'editor' => [
            'title'       => 'sometimes',
            'content'     => 'sometimes',
            'excerpt'     => 'sometimes',
            'category_id' => 'sometimes',
        ],

        // Author (wildcard): can only update title and content
        '*' => [
            'title'   => 'sometimes',
            'content' => 'sometimes',
        ],
    ];

    // -------------------------------------------------------
    // Custom error messages
    // -------------------------------------------------------
    protected $validationRulesMessages = [
        'title.required'    => 'Every post needs a title.',
        'title.max'         => 'Title cannot exceed 255 characters.',
        'content.required'  => 'Please provide content for the post.',
        'excerpt.max'       => 'Excerpt cannot exceed 500 characters.',
        'status.in'         => 'Status must be one of: draft, published, or archived.',
        'category_id.exists' => 'The selected category does not exist.',
        'tags.*.max'        => 'Each tag must be 50 characters or fewer.',
    ];
}
```

With this configuration:

| Action | Admin | Editor | Author (`*`) |
|--------|-------|--------|--------------|
| **Create** | All fields; `title` and `content` required | `title`, `content` (required), `excerpt`, `category_id` | Only `title` and `content` (required) |
| **Update** | Can modify any field | Can modify `title`, `content`, `excerpt`, `category_id` | Can only modify `title` and `content` |

An **editor** sending `{ "title": "New Post", "content": "...", "is_published": true, "is_pinned": true }` will have `is_published` and `is_pinned` silently stripped. The post is created with only `title` and `content`.

An **admin** sending the same payload will have all four fields accepted and applied.

An **author** (or any role without a specific key) falls through to the `*` wildcard and can only set `title` and `content`.
