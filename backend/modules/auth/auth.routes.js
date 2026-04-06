import { Router } from 'express';
import { register, login, logout, refresh } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/refresh', refresh);
router.post('/login', login);
router.post('/logout', authenticate, logout);

export default router;