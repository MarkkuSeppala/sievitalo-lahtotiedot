import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getSubmissions,
  getSubmissionById,
  exportSubmissionPDF,
  getSubmissionChanges
} from '../controllers/submissionController';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getSubmissions);
router.get('/:id/changes', getSubmissionChanges);
router.get('/:id', getSubmissionById);
router.get('/:id/pdf', exportSubmissionPDF);

export default router;









