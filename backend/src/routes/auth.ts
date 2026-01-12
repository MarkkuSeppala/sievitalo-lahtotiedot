import express from 'express';
import { login, register, verifyToken } from '../controllers/authController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

router.post('/login', login);
router.get('/verify', authenticateToken, verifyToken);
router.post('/register', authenticateToken, requireAdmin(), register);

export default router;




