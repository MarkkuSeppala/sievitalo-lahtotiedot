import { Request, Response } from 'express';
import { pool } from '../db';
import path from 'path';
import fs from 'fs';
import { sendFormSubmissionEmail } from '../services/emailService';

export const getSubmissionByToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    // Get customer
    const customerResult = await pool.query(
      'SELECT id, name, email, token, name1, name2 FROM customers WHERE token = $1',
      [token]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    const customer = customerResult.rows[0];

    // Get or create submission
    let submissionResult = await pool.query(
      'SELECT id, status, submitted_at FROM submissions WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 1',
      [customer.id]
    );

    let submissionId: number;
    if (submissionResult.rows.length === 0) {
      // Create new submission
      const newSubmission = await pool.query(
        'INSERT INTO submissions (customer_id, status, created_at) VALUES ($1, $2, NOW()) RETURNING id',
        [customer.id, 'draft']
      );
      submissionId = newSubmission.rows[0].id;
    } else {
      submissionId = submissionResult.rows[0].id;
    }

    // Get all field values
    const fieldsResult = await pool.query(
      'SELECT field_name, field_value FROM submission_fields WHERE submission_id = $1',
      [submissionId]
    );

    // Get all files
    const filesResult = await pool.query(
      'SELECT id, field_name, file_name, file_url FROM submission_files WHERE submission_id = $1',
      [submissionId]
    );

    const fields: Record<string, any> = {};
    fieldsResult.rows.forEach((row) => {
      try {
        fields[row.field_name] = JSON.parse(row.field_value);
      } catch (e) {
        // If parsing fails, use the value as-is (for backwards compatibility)
        fields[row.field_name] = row.field_value;
      }
    });

    const files: Record<string, any[]> = {};
    filesResult.rows.forEach((row) => {
      if (!files[row.field_name]) {
        files[row.field_name] = [];
      }
      files[row.field_name].push({
        id: row.id,
        name: row.file_name,
        url: row.file_url
      });
    });

    res.json({
      customer,
      submission: {
        id: submissionId,
        fields,
        files
      }
    });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const saveSubmission = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const fields = req.body.fields ? JSON.parse(req.body.fields) : {};
    const files = req.files as Express.Multer.File[] | undefined;

    // Get customer
    const customerResult = await pool.query(
      'SELECT id FROM customers WHERE token = $1',
      [token]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    const customerId = customerResult.rows[0].id;

    // Get or create submission
    let submissionResult = await pool.query(
      'SELECT id FROM submissions WHERE customer_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
      [customerId, 'draft']
    );

    let submissionId: number;
    if (submissionResult.rows.length === 0) {
      const newSubmission = await pool.query(
        'INSERT INTO submissions (customer_id, status, created_at) VALUES ($1, $2, NOW()) RETURNING id',
        [customerId, 'draft']
      );
      submissionId = newSubmission.rows[0].id;
    } else {
      submissionId = submissionResult.rows[0].id;
    }

    // Save fields
    if (fields) {
      for (const [fieldName, fieldValue] of Object.entries(fields)) {
        await pool.query(
          `INSERT INTO submission_fields (submission_id, field_name, field_value)
           VALUES ($1, $2, $3)
           ON CONFLICT (submission_id, field_name) DO UPDATE SET field_value = $3`,
          [submissionId, fieldName, JSON.stringify(fieldValue)]
        );
      }
    }

    // Save files
    if (files && files.length > 0) {
      // Parse field names from request
      const fieldNames = req.body.fieldNames ? JSON.parse(req.body.fieldNames) : {};
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fieldName = fieldNames[file.originalname] || req.body.fieldName || 'general';
        const fileUrl = `/uploads/${file.filename}`;

        await pool.query(
          `INSERT INTO submission_files (submission_id, field_name, file_name, file_url)
           VALUES ($1, $2, $3, $4)`,
          [submissionId, fieldName, file.originalname, fileUrl]
        );
      }
    }

    res.json({ success: true, submissionId });
  } catch (error) {
    console.error('Save submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteFile = async (req: Request, res: Response) => {
  try {
    const { token, fileId } = req.params;

    // Get customer
    const customerResult = await pool.query(
      'SELECT id FROM customers WHERE token = $1',
      [token]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    const customerId = customerResult.rows[0].id;

    // Get submission
    const submissionResult = await pool.query(
      'SELECT id FROM submissions WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 1',
      [customerId]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submissionId = submissionResult.rows[0].id;

    // Get file info
    const fileResult = await pool.query(
      'SELECT file_url FROM submission_files WHERE id = $1 AND submission_id = $2',
      [fileId, submissionId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileUrl = fileResult.rows[0].file_url;
    
    // Delete file from filesystem
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, path.basename(fileUrl));
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete file from database
    await pool.query(
      'DELETE FROM submission_files WHERE id = $1 AND submission_id = $2',
      [fileId, submissionId]
    );

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const submitForm = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const fields = req.body.fields ? JSON.parse(req.body.fields) : {};
    const files = req.files as Express.Multer.File[] | undefined;

    // Get customer with representative email
    const customerResult = await pool.query(
      `SELECT c.id, c.name, c.email, u.email as edustaja_email
       FROM customers c
       LEFT JOIN users u ON c.edustaja_id = u.id
       WHERE c.token = $1`,
      [token]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    const customer = customerResult.rows[0];
    const customerId = customer.id;

    // Get or create submission
    let submissionResult = await pool.query(
      'SELECT id FROM submissions WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 1',
      [customerId]
    );

    let submissionId: number;
    if (submissionResult.rows.length === 0) {
      const newSubmission = await pool.query(
        'INSERT INTO submissions (customer_id, status, created_at) VALUES ($1, $2, NOW()) RETURNING id',
        [customerId, 'submitted']
      );
      submissionId = newSubmission.rows[0].id;
    } else {
      submissionId = submissionResult.rows[0].id;
      await pool.query(
        'UPDATE submissions SET status = $1, submitted_at = NOW() WHERE id = $2',
        ['submitted', submissionId]
      );
    }

    // Save fields
    if (fields) {
      for (const [fieldName, fieldValue] of Object.entries(fields)) {
        await pool.query(
          `INSERT INTO submission_fields (submission_id, field_name, field_value)
           VALUES ($1, $2, $3)
           ON CONFLICT (submission_id, field_name) DO UPDATE SET field_value = $3`,
          [submissionId, fieldName, JSON.stringify(fieldValue)]
        );
      }
    }

    // Save files
    if (files && files.length > 0) {
      // Parse field names from request
      const fieldNames = req.body.fieldNames ? JSON.parse(req.body.fieldNames) : {};
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fieldName = fieldNames[file.originalname] || req.body.fieldName || 'general';
        const fileUrl = `/uploads/${file.filename}`;

        await pool.query(
          `INSERT INTO submission_files (submission_id, field_name, file_name, file_url)
           VALUES ($1, $2, $3, $4)`,
          [submissionId, fieldName, file.originalname, fileUrl]
        );
      }
    }

    // Send email to representative
    if (customer.edustaja_email) {
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const formUrl = `${frontendUrl}/submissions/${submissionId}`;
        
        await sendFormSubmissionEmail({
          customerName: customer.name,
          customerEmail: customer.email,
          representativeEmail: customer.edustaja_email,
          formUrl: formUrl
        });
      } catch (emailError) {
        // Log error but don't fail the submission
        console.error('Failed to send email notification:', emailError);
      }
    }

    res.json({ success: true, submissionId, message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Submit form error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

