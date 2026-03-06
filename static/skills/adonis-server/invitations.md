# Lumina AdonisJS Server — Invitations (Skill)

You are a senior software engineer specialized in **Lumina**, an AdonisJS package that generates fully-featured REST APIs from model definitions. You are friendly, practical, and always provide code snippets. When answering, assume the developer is working with the **AdonisJS (TypeScript)** version of Lumina.

---

## What This Skill Covers

This skill covers Lumina's built-in invitation system for multi-tenant organizations: the invitation flow, InvitationsController endpoints (list, create, resend, cancel, accept), the OrganizationInvitation model, token generation, expiration handling, InvitationPolicy authorization, allowedRoles configuration, and email notifications.

---

## Documentation

### Overview

The invitation flow works as follows:

1. An authenticated user creates an invitation for an email address within an organization
2. A 64-character hex token is generated and an email notification is sent
3. The invitee receives the email and clicks the acceptance link
4. If the invitee is authenticated, the invitation is accepted immediately and they are added to the organization with the assigned role
5. If the invitee is not authenticated, the API returns the invitation details so the frontend can redirect to a registration page

### Configuration

Configure invitations in `config/lumina.ts`:

```ts
import { defineConfig } from '@startsoft/lumina-adonis'

export default defineConfig({
  invitations: {
    expiresDays: 7,           // Days until invitation expires (default: 7)
    allowedRoles: null,       // null = all roles, or ['admin', 'editor']
  },
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `expiresDays` | `number` | `7` | Number of days until an invitation expires |
| `allowedRoles` | `string[] \| null` | `null` | Role slugs allowed to create invitations. `null` allows all members |

### InvitationsController Endpoints

#### List Invitations

```
GET /api/:organization/invitations
```

Lists all invitations for the organization. Supports filtering by status.

**Query Parameters:**

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `status` | `pending`, `expired`, `all` | `all` | Filter invitations by status |

**Authorization:** User must be authenticated and belong to the organization.

**Response:** Array of invitation objects with preloaded `organization`, `role`, and `invitedByUser` relationships.

#### Create Invitation

```
POST /api/:organization/invitations
```

Creates a new invitation and sends an email notification.

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "role_id": 2
}
```

**Validation:**
- `email` -- required, valid email, max 255 characters
- `role_id` -- required, integer

**Checks performed:**
1. No duplicate pending invitation for the same email and organization
2. User with this email is not already a member of the organization
3. The specified role exists

**Authorization:** User must belong to the organization. If `invitations.allowedRoles` is configured, the user must hold one of the listed roles.

**Response:** `201 Created` with the serialized invitation.

#### Resend Invitation

```
POST /api/:organization/invitations/:id/resend
```

Resends the invitation email and refreshes the expiration date. Only pending invitations can be resent.

**Authorization:** User must belong to the organization and the invitation must be in `pending` status.

**Response:** `200 OK` with a success message and the updated invitation.

#### Cancel Invitation

```
DELETE /api/:organization/invitations/:id
```

Cancels a pending invitation by setting its status to `cancelled`. The invitation record is not deleted from the database.

**Authorization:** User must belong to the organization and the invitation must be in `pending` status.

**Response:** `200 OK` with a success message.

#### Accept Invitation

```
POST /api/invitations/accept
```

Accepts an invitation using a token. This is a public endpoint (no organization middleware) because the invitee may not yet be a member.

**Request Body:**

```json
{
  "token": "a1b2c3d4e5f6...64-char-hex-token"
}
```

**Validation:**
- `token` -- required, string, exactly 64 characters

**Behavior:**

- If the user is **not authenticated**, the response includes the invitation details and `requires_registration: true`, allowing the frontend to redirect to a registration page
- If the user **is authenticated**, the invitation is accepted immediately, and the user is added to the organization with the assigned role

**Response (not authenticated):**
```json
{
  "invitation": { "..." },
  "requires_registration": true,
  "message": "Please register or login to accept this invitation"
}
```

**Response (authenticated):**
```json
{
  "message": "Invitation accepted successfully",
  "invitation": { "..." },
  "organization": { "..." }
}
```

### OrganizationInvitation Model

The `OrganizationInvitation` model represents an invitation record:

```ts
import OrganizationInvitation from '@startsoft/lumina-adonis/models/organization_invitation'
```

#### Columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | `number` | Primary key |
| `organizationId` | `number` | The organization the invitee is being invited to |
| `email` | `string` | The email address of the invitee |
| `roleId` | `number` | The role to assign upon acceptance |
| `invitedBy` | `number` | The user ID of the person who created the invitation |
| `token` | `string` | A cryptographically random 64-character hex token |
| `status` | `string` | One of: `pending`, `expired`, `cancelled`, `accepted` |
| `expiresAt` | `DateTime \| null` | When the invitation expires |
| `acceptedAt` | `DateTime \| null` | When the invitation was accepted |
| `createdAt` | `DateTime` | When the invitation was created |
| `updatedAt` | `DateTime` | When the invitation was last updated |
| `deletedAt` | `DateTime \| null` | Soft delete timestamp |

#### Relationships

- `organization` -- BelongsTo Organization
- `role` -- BelongsTo Role
- `invitedByUser` -- BelongsTo User

#### Instance Methods

| Method | Description |
|--------|-------------|
| `isExpired()` | Returns `true` if the invitation is pending and past its expiration date |
| `isPending()` | Returns `true` if the status is `pending` and the invitation has not expired |
| `accept(user)` | Accepts the invitation for the given user, sets status to `accepted`, and adds the user to the organization |

#### Scopes

```ts
// Query only pending, non-expired invitations
await OrganizationInvitation.query().withScopes((s) => s.pending())

// Query only expired invitations
await OrganizationInvitation.query().withScopes((s) => s.expired())
```

### Token Generation

Tokens are generated automatically in the `@beforeCreate` hook using Node.js's `crypto.randomBytes()`:

```ts
import { randomBytes } from 'node:crypto'

// 32 bytes = 64 hex characters
const token = randomBytes(32).toString('hex')
```

This produces a cryptographically secure, URL-safe token suitable for inclusion in email links.

### Expiration Handling

When an invitation is created, the `expiresAt` field is automatically set based on the `invitations.expiresDays` config value (default: 7 days):

```ts
invitation.expiresAt = DateTime.now().plus({ days: 7 })
```

When an invitation is resent, the expiration is refreshed to start a new countdown from the current time.

When accepting an invitation, the system checks if the invitation has expired. If it has, the status is updated to `expired` and a `422` error is returned.

### InvitationPolicy Authorization

The `InvitationPolicy` class controls access to invitation endpoints:

| Method | Permission Required |
|--------|-------------------|
| `viewAny(user, organization)` | User must be authenticated and belong to the organization |
| `create(user, organization)` | User must belong to the org. If `allowedRoles` is configured, user must hold one of those roles |
| `update(user, invitation, organization)` | User must belong to the org. Invitation must be pending |
| `delete(user, invitation, organization)` | Same as update |

### Allowed Roles

By default, any member of an organization can create invitations. To restrict this to specific roles:

```ts
// config/lumina.ts
invitations: {
  expiresDays: 7,
  allowedRoles: ['admin', 'manager'], // Only admins and managers can invite
},
```

When set to `null` (default), all organization members can create invitations.

### Email Notifications

When an invitation is created or resent, Lumina sends an email notification using AdonisJS's mail service (`@adonisjs/mail`). The system first tries to render an HTML view at `emails/invitation`, falling back to a plain text email if the view is not available.

If email sending fails entirely, the invitation is still created. The email can be resent later using the resend endpoint.

---

## Frequently Asked Questions

**Q: How do I set up invitations in my Lumina app?**

A: Invitations are automatically available when multi-tenancy is enabled with a `tenant` route group. Configure the invitation settings in `config/lumina.ts`:

```ts
export default defineConfig({
  routeGroups: {
    tenant: {
      prefix: ':organization',
      middleware: ['lumina:resolveOrg'],
      models: '*',
    },
  },
  invitations: {
    expiresDays: 7,
    allowedRoles: null,
  },
})
```

The invitation endpoints are automatically registered under the tenant prefix.

**Q: How do I restrict who can create invitations?**

A: Use the `allowedRoles` config option to limit invitation creation to specific roles:

```ts
invitations: {
  allowedRoles: ['admin', 'manager'],
},
```

Only users holding the `admin` or `manager` role in the organization can create invitations.

**Q: What happens when an invitation expires?**

A: When a user tries to accept an expired invitation, the system updates its status to `expired` and returns a `422` error. The invitation can be resent by an organization member using the resend endpoint, which refreshes the expiration date.

**Q: How does the accept endpoint handle unauthenticated users?**

A: If the user is not authenticated, the API returns `requires_registration: true` along with the invitation details. The frontend can use this to redirect the user to a registration page, passing the token along so the invitation can be accepted after registration.

**Q: Can I customize the invitation email template?**

A: Yes. Create an Edge template at `resources/views/emails/invitation.edge`. Lumina will use this template for invitation emails. If the template is not found, a plain text fallback is sent.

**Q: What happens if the email fails to send?**

A: The invitation is still created successfully. Email sending is non-blocking. You can resend the email later using the `POST /api/:organization/invitations/:id/resend` endpoint.

**Q: How do I query pending invitations programmatically?**

A: Use the built-in scopes on the `OrganizationInvitation` model:

```ts
import OrganizationInvitation from '@startsoft/lumina-adonis/models/organization_invitation'

// Get all pending invitations for an org
const pending = await OrganizationInvitation.query()
  .where('organization_id', orgId)
  .withScopes((s) => s.pending())
```

---

## Real-World Examples

### Team Management: Inviting a New Team Member

```ts
// Frontend makes this request
// POST /api/acme-corp/invitations
const response = await fetch('/api/acme-corp/invitations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    email: 'jane.doe@example.com',
    role_id: 2, // 'editor' role
  }),
})

// Response: 201 Created
// {
//   "id": 15,
//   "email": "jane.doe@example.com",
//   "status": "pending",
//   "expiresAt": "2026-03-13T00:00:00.000Z",
//   "organization": { "id": 1, "name": "Acme Corp" },
//   "role": { "id": 2, "name": "Editor" }
// }
```

### Accepting an Invitation (Authenticated User)

```ts
// User clicks the invitation link and is already logged in
// POST /api/invitations/accept
const response = await fetch('/api/invitations/accept', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    token: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd',
  }),
})

// Response: 200 OK
// {
//   "message": "Invitation accepted successfully",
//   "invitation": { "id": 15, "status": "accepted", ... },
//   "organization": { "id": 1, "name": "Acme Corp", "slug": "acme-corp" }
// }
```

### Accepting an Invitation (New User -- Registration Required)

```ts
// User clicks the invitation link but is NOT logged in
// POST /api/invitations/accept (no Authorization header)
const response = await fetch('/api/invitations/accept', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd',
  }),
})

// Response: 200 OK
// {
//   "invitation": { "id": 15, "email": "jane.doe@example.com", ... },
//   "requires_registration": true,
//   "message": "Please register or login to accept this invitation"
// }

// Frontend redirects to: /register?invitation_token=a1b2c3d4...
// After registration, the frontend calls accept again with the auth token
```
