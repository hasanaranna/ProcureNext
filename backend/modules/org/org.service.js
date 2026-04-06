import crypto from 'crypto';
import { pool } from '../../config/db.js';

/**
 * Generate a unique invitation token.
 */
export function generateInvitationToken() {
  return crypto.randomUUID();
}

/**
 * Create and store an invitation.
 */
export async function createInvitation(organizationId, invitedByUserId, email) {
  const token = generateInvitationToken();

  // Check for existing pending invitation to same email for same org
  const existing = await pool.query(
    `SELECT invitation_id FROM user_invitations
     WHERE organization_id = $1 AND email = $2 AND status = 'Pending'`,
    [organizationId, email]
  );

  if (existing.rows.length > 0) {
    throw { statusCode: 409, code: 'CONFLICT', message: 'An invitation has already been sent to this email address.' };
  }

  // Check if user is already a member
  const memberCheck = await pool.query(
    `SELECT oe.org_user_id FROM organization_employees oe
     JOIN users u ON u.user_id = oe.user_id
     WHERE oe.organization_id = $1 AND u.email = $2`,
    [organizationId, email]
  );

  if (memberCheck.rows.length > 0) {
    throw { statusCode: 409, code: 'CONFLICT', message: 'This user is already a member of your organization.' };
  }

  const result = await pool.query(
    `INSERT INTO user_invitations (organization_id, invited_by, email, token)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [organizationId, invitedByUserId, email, token]
  );

  return result.rows[0];
}

/**
 * Fetch all invitations for an organization.
 */
export async function getInvitations(organizationId) {
  const result = await pool.query(
    `SELECT invitation_id, email, status, token, created_at, expires_at
     FROM user_invitations
     WHERE organization_id = $1
     ORDER BY created_at DESC`,
    [organizationId]
  );
  return result.rows;
}

/**
 * Cancel a pending invitation.
 */
export async function cancelInvitation(invitationId, organizationId) {
  const result = await pool.query(
    `UPDATE user_invitations SET status = 'Cancelled'
     WHERE invitation_id = $1 AND organization_id = $2 AND status = 'Pending'
     RETURNING *`,
    [invitationId, organizationId]
  );
  if (result.rows.length === 0) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Invitation not found or already processed.' };
  }
  return result.rows[0];
}

/**
 * Get all members of an organization.
 */
export async function getMembers(organizationId) {
  const result = await pool.query(
    `SELECT oe.org_user_id, oe.role_in_org, oe.joined_at,
            u.user_id, u.full_name, u.email, u.phone, u.status
     FROM organization_employees oe
     JOIN users u ON u.user_id = oe.user_id
     WHERE oe.organization_id = $1
     ORDER BY oe.joined_at ASC`,
    [organizationId]
  );
  return result.rows;
}

/**
 * Update a member's role in the organization.
 */
export async function updateMemberRole(orgUserId, organizationId, newRole) {
  // Validate role
  if (!newRole || typeof newRole !== 'string' || newRole.trim() === '') {
    throw { statusCode: 400, code: 'INVALID_ROLE', message: `Role cannot be empty.` };
  }
  const roleName = newRole.trim();

  // Prevent changing the Owner's role (the original owner)
  const memberCheck = await pool.query(
    `SELECT oe.org_user_id, oe.role_in_org, oe.user_id, o.primary_contact
     FROM organization_employees oe
     JOIN organizations o ON o.organization_id = oe.organization_id
     WHERE oe.org_user_id = $1 AND oe.organization_id = $2`,
    [orgUserId, organizationId]
  );

  if (memberCheck.rows.length === 0) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Member not found in your organization.' };
  }

  const member = memberCheck.rows[0];
  if (member.user_id === member.primary_contact && roleName !== 'Owner') {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'Cannot change the primary owner\'s role.' };
  }

  const result = await pool.query(
    `UPDATE organization_employees SET role_in_org = $1
     WHERE org_user_id = $2 AND organization_id = $3
     RETURNING *`,
    [roleName, orgUserId, organizationId]
  );

  return result.rows[0];
}

/**
 * Validate an invitation token and return details (public).
 */
export async function getInvitationByToken(token) {
  const result = await pool.query(
    `SELECT ui.invitation_id, ui.email, ui.status, ui.expires_at,
            o.organization_name, o.organization_id
     FROM user_invitations ui
     JOIN organizations o ON o.organization_id = ui.organization_id
     WHERE ui.token = $1`,
    [token]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const inv = result.rows[0];
  return {
    invitation_id: inv.invitation_id,
    email: inv.email,
    status: inv.status,
    expires_at: inv.expires_at,
    organization_name: inv.organization_name,
    organization_id: inv.organization_id,
    is_valid: inv.status === 'Pending' && new Date(inv.expires_at) > new Date(),
  };
}
