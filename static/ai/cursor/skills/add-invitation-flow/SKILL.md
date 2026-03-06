---
name: add-invitation-flow
description: Generates React components for the Lumina invitation system including invitation management (list, send, resend, cancel) and the public accept-invitation page. Use this skill when implementing user invitation flows in a multi-tenant Lumina application.
---

# Add Invitation Flow

Generates React components for the complete Lumina invitation system, including an admin-facing invitation management panel and a public accept-invitation page.

## Workflow

### Step 1: Gather Requirements

Ask the user:

> 1. What roles are available for invitation? (Read `app/Models/Role.php` to get the `$roles` list, or check `config/lumina.php` `invitations.allowed_roles`)
> 2. Should the invitation management page show role selection? (Some apps assign a default role)
> 3. Where should the accept-invitation page live? (It is a public route -- no authentication required)
> 4. What should happen after a user accepts an invitation? (Redirect to login? Auto-login and redirect to dashboard?)
> 5. Is this for React web or React Native?

**Backend context**: The Lumina backend provides these API endpoints:
- `GET /{organization}/invitations` -- List invitations (requires auth + org context)
- `POST /{organization}/invitations` -- Send an invitation (requires auth + org context)
- `POST /{organization}/invitations/{id}/resend` -- Resend a pending invitation
- `DELETE /{organization}/invitations/{id}` -- Cancel a pending invitation
- `POST /invitations/accept` -- Accept an invitation (public, token-based, no auth required)

### Step 2: Generate Invitation Management Component

Create `src/components/invitations/InvitationManager.tsx`:

```tsx
import React, { useState } from 'react';
import {
  useInvitations,
  useInviteUser,
  useResendInvitation,
  useCancelInvitation,
} from '@startsoft/lumina';

interface Invitation {
  id: number;
  email: string;
  role_id: number;
  role_name: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
}

interface Role {
  id: number;
  name: string;
  slug: string;
}

interface InvitationManagerProps {
  roles: Role[];
}

export function InvitationManager({ roles }: InvitationManagerProps) {
  const { data: invitations, isLoading, error, refetch } = useInvitations();

  if (isLoading) {
    return <div className="loading">Loading invitations...</div>;
  }

  if (error) {
    if (error.status === 403) {
      return <div className="error">You do not have permission to manage invitations.</div>;
    }
    return <div className="error">Error loading invitations: {error.message}</div>;
  }

  return (
    <div>
      <h1>Invitations</h1>

      {/* Invite form */}
      <InviteUserForm roles={roles} onInvited={refetch} />

      {/* Invitation list */}
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Expires</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invitations?.map((invitation: Invitation) => (
            <InvitationRow
              key={invitation.id}
              invitation={invitation}
              onUpdated={refetch}
            />
          ))}
        </tbody>
      </table>

      {(!invitations || invitations.length === 0) && (
        <p>No invitations found.</p>
      )}
    </div>
  );
}

interface InviteUserFormProps {
  roles: Role[];
  onInvited: () => void;
}

function InviteUserForm({ roles, onInvited }: InviteUserFormProps) {
  const { invite, isLoading, validationErrors } = useInviteUser();
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState<number>(roles[0]?.id ?? 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await invite({ email, role_id: roleId });
      setEmail('');
      onInvited();
    } catch (error) {
      // validationErrors auto-populated for 422
      console.error('Invitation failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="invite-form">
      <h2>Send Invitation</h2>

      <div className="field">
        <label htmlFor="invite-email">Email Address *</label>
        <input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          required
        />
        {validationErrors?.email && (
          <span className="error">{validationErrors.email[0]}</span>
        )}
      </div>

      <div className="field">
        <label htmlFor="invite-role">Role *</label>
        <select
          id="invite-role"
          value={roleId}
          onChange={(e) => setRoleId(Number(e.target.value))}
        >
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        {validationErrors?.role_id && (
          <span className="error">{validationErrors.role_id[0]}</span>
        )}
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send Invitation'}
      </button>
    </form>
  );
}

interface InvitationRowProps {
  invitation: Invitation;
  onUpdated: () => void;
}

function InvitationRow({ invitation, onUpdated }: InvitationRowProps) {
  const { resend, isLoading: isResending } = useResendInvitation(invitation.id);
  const { cancel, isLoading: isCancelling } = useCancelInvitation(invitation.id);

  const handleResend = async () => {
    try {
      await resend();
      onUpdated();
    } catch (error) {
      alert('Failed to resend invitation.');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this invitation?')) return;
    try {
      await cancel();
      onUpdated();
    } catch (error) {
      alert('Failed to cancel invitation.');
    }
  };

  const isPending = invitation.status === 'pending';
  const isExpired = new Date(invitation.expires_at) < new Date();

  return (
    <tr>
      <td>{invitation.email}</td>
      <td>{invitation.role_name}</td>
      <td>
        <span className={`status status-${invitation.status}`}>
          {invitation.status}
          {isPending && isExpired && ' (expired)'}
        </span>
      </td>
      <td>{new Date(invitation.expires_at).toLocaleDateString()}</td>
      <td>
        {isPending && !isExpired && (
          <>
            <button onClick={handleResend} disabled={isResending}>
              {isResending ? 'Resending...' : 'Resend'}
            </button>
            <button onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          </>
        )}
        {isPending && isExpired && (
          <button onClick={handleResend} disabled={isResending}>
            {isResending ? 'Resending...' : 'Resend'}
          </button>
        )}
      </td>
    </tr>
  );
}
```

### Step 3: Generate Accept Invitation Page

Create `src/components/invitations/AcceptInvitation.tsx`:

This is a **public page** that does not require authentication. Users arrive here via an invitation link with a token.

```tsx
import React, { useState } from 'react';
import { useAcceptInvitation } from '@startsoft/lumina';

interface AcceptInvitationProps {
  token: string; // Extracted from URL query parameter or route param
  onAccepted?: () => void; // Callback after successful acceptance
}

export function AcceptInvitation({ token, onAccepted }: AcceptInvitationProps) {
  const { accept, isLoading, validationErrors, error } = useAcceptInvitation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await accept({
        token,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
      });
      onAccepted?.();
    } catch (error: any) {
      if (error.status === 404) {
        alert('This invitation is invalid or has expired.');
      }
      // validationErrors auto-populated for 422
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (error && error.status === 404) {
    return (
      <div className="error-page">
        <h1>Invalid Invitation</h1>
        <p>This invitation link is invalid or has expired. Please contact the person who invited you.</p>
      </div>
    );
  }

  return (
    <div className="accept-invitation">
      <h1>Accept Invitation</h1>
      <p>Complete your account setup to join the organization.</p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">Full Name *</label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
          />
          {validationErrors?.name && (
            <span className="error">{validationErrors.name[0]}</span>
          )}
        </div>

        <div className="field">
          <label htmlFor="email">Email Address *</label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            required
          />
          {validationErrors?.email && (
            <span className="error">{validationErrors.email[0]}</span>
          )}
        </div>

        <div className="field">
          <label htmlFor="password">Password *</label>
          <input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            required
            minLength={8}
          />
          {validationErrors?.password && (
            <span className="error">{validationErrors.password[0]}</span>
          )}
        </div>

        <div className="field">
          <label htmlFor="password_confirmation">Confirm Password *</label>
          <input
            id="password_confirmation"
            type="password"
            value={formData.password_confirmation}
            onChange={(e) => handleChange('password_confirmation', e.target.value)}
            required
            minLength={8}
          />
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Accept Invitation'}
        </button>
      </form>
    </div>
  );
}
```

### Step 4: Verify Checklist

- [ ] Invitation management component uses `useInvitations` to list invitations
- [ ] Invite form uses `useInviteUser` with `{ email, role_id }` payload
- [ ] Invite form includes role selection dropdown populated from available roles
- [ ] Invite form displays validation errors from 422 responses
- [ ] Resend button uses `useResendInvitation(invitationId)` for pending invitations
- [ ] Cancel button uses `useCancelInvitation(invitationId)` with confirmation dialog
- [ ] Invitation list displays status (pending, accepted, expired, cancelled)
- [ ] Expired pending invitations are visually distinguished
- [ ] Accept invitation page uses `useAcceptInvitation` hook
- [ ] Accept invitation page is a public route (no `AuthProvider` required)
- [ ] Accept invitation page extracts the token from URL parameters
- [ ] Accept invitation page collects name, email, password, and password confirmation
- [ ] Accept invitation page displays validation errors (422)
- [ ] Accept invitation page handles invalid/expired tokens (404)
- [ ] All invitation hooks import from `@startsoft/lumina`
- [ ] Error handling covers 403 (forbidden), 404 (not found), and 422 (validation)
