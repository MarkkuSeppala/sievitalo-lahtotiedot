import express from 'express';
import { saveSubmission, getSubmissionByToken, submitForm, deleteFile } from '../controllers/formController';
import { upload } from '../middleware/upload';

const router = express.Router();

// Error handling middleware for multer
const handleMulterError = (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    if (err.message && err.message.includes('Invalid file type')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  }
  next();
};

// Public route - no authentication needed (uses token in URL)
router.get('/:token', getSubmissionByToken);
router.post('/:token/save', upload.array('files', 20), handleMulterError, saveSubmission);
router.post('/:token/submit', upload.array('files', 20), handleMulterError, submitForm);
router.delete('/:token/file/:fileId', deleteFile);

export default router;

