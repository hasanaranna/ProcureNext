import * as orgService from './org.service.js';

// ─── Send Invitation ────────────────────────────────────────
export const sendInvitation = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Email is required.', status: 400 }
      });
    }

    const invitation = await orgService.createInvitation(
      req.user.organization_id,
      req.user.id,
      email.trim().toLowerCase()
    );

    return res.status(201).json({
      success: true,
      invitation: {
        invitation_id: invitation.invitation_id,
        email: invitation.email,
        token: invitation.token,
        status: invitation.status,
        created_at: invitation.created_at,
        expires_at: invitation.expires_at,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: { code: error.code, message: error.message, status: error.statusCode }
      });
    }
    next(error);
  }
};

// ─── List Invitations ───────────────────────────────────────
export const listInvitations = async (req, res, next) => {
  try {
    const invitations = await orgService.getInvitations(req.user.organization_id);
    return res.status(200).json({
      success: true,
      invitations,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Cancel Invitation ──────────────────────────────────────
export const cancelInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;
    await orgService.cancelInvitation(parseInt(id), req.user.organization_id);
    return res.status(200).json({
      success: true,
      message: 'Invitation cancelled successfully.',
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: { code: error.code, message: error.message, status: error.statusCode }
      });
    }
    next(error);
  }
};

// ─── List Members ───────────────────────────────────────────
export const listMembers = async (req, res, next) => {
  try {
    const members = await orgService.getMembers(req.user.organization_id);
    return res.status(200).json({
      success: true,
      members,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Update Member Role ─────────────────────────────────────
export const updateMemberRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Role is required.', status: 400 }
      });
    }

    const updated = await orgService.updateMemberRole(
      parseInt(id),
      req.user.organization_id,
      role
    );

    return res.status(200).json({
      success: true,
      member: updated,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: { code: error.code, message: error.message, status: error.statusCode }
      });
    }
    next(error);
  }
};

// ─── Get Invitation Details (public) ────────────────────────
export const getInvitationDetails = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Token query parameter is required.', status: 400 }
      });
    }

    const details = await orgService.getInvitationByToken(token);

    if (!details) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Invitation not found.', status: 404 }
      });
    }

    return res.status(200).json({
      success: true,
      invitation: details,
    });
  } catch (error) {
    next(error);
  }
};
