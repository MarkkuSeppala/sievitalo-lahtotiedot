import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Use memory storage for S3 uploads, disk storage as fallback for local development
const USE_S3 = !!process.env.AWS_S3_BUCKET_NAME;

const storage = USE_S3
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
        if (!fs.existsSync(UPLOAD_DIR)) {
          fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        }
        cb(null, UPLOAD_DIR);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      }
    });

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/acad',
    'application/x-dwg',
    'application/x-dwg', // DWG variant
    'image/pjpeg', // JPEG variant
    'image/x-png' // PNG variant
  ];

  // Check by mimetype or file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.dwg'];
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    console.warn(`File rejected: ${file.originalname}, mimetype: ${file.mimetype}, ext: ${ext}`);
    cb(new Error(`Invalid file type: ${file.originalname}. Allowed: PDF, JPG, PNG, DOC, DOCX, DWG`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

