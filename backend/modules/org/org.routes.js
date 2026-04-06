import { Router } from 'express';
import { authenticate, requireOwner } from '../../middleware/auth.middleware.js';
import {
  sendInvitation,
  listInvitations,
  cancelInvitation,
  listMembers,
  updateMemberRole,
  getInvitationDetails,
} from './org.controller.js';

const router = Router();

// Public route — validate invitation token (no auth needed)
router.get('/invitation-details', getInvitationDetails);

// Protected routes — require auth + Owner role
router.post('/invitations', authenticate, requireOwner, sendInvitation);
router.get('/invitations', authenticate, requireOwner, listInvitations);
router.delete('/invitations/:id', authenticate, requireOwner, cancelInvitation);

router.get('/members', authenticate, requireOwner, listMembers);
router.patch('/members/:id/role', authenticate, requireOwner, updateMemberRole);

export default router;
