import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import {
  createCustomer,
  getCustomers,
  getCustomerByToken,
  getCustomerSubmissions,
  deleteCustomer
} from '../controllers/customerController';

const router = express.Router();

router.use(authenticateToken);

router.post('/', createCustomer);
router.get('/', getCustomers);
router.get('/:token', getCustomerByToken);
router.get('/:token/submissions', getCustomerSubmissions);
router.delete('/:id', requireAdmin(), deleteCustomer);

export default router;

