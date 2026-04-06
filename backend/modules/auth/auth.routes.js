import { Router } from 'express';
import { registerMaster, registerUser, login, logout, refresh, getMe } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { uploadFields } from '../../config/upload.js';

const router = Router();

// Master account registration (multipart form — files + JSON)
router.post('/register-master', uploadFields, registerMaster);

// User registration via invitation token (multipart form — files + JSON)
router.post('/register-user', uploadFields, registerUser);

// Auth: login, logout, refresh, me
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.post('/refresh', refresh);
router.get('/me', authenticate, getMe);

export default router;