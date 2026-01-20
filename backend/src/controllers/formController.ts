import { Request, Response } from 'express';
import { pool } from '../db';
import path from 'path';
import fs from 'fs';
import { sendFormSubmissionEmail } from '../services/emailService';
import { uploadToS3, deleteFromS3 } from '../services/s3Service';
import { v4 as uuidv4 } from 'uuid';

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

    const cloneSubmissionData = async (fromSubmissionId: number, toSubmissionId: number) => {
      // Clone fields
      await pool.query(
        `INSERT INTO submission_fields (submission_id, field_name, field_value)
         SELECT $2, field_name, field_value
         FROM submission_fields
         WHERE submission_id = $1`,
        [fromSubmissionId, toSubmissionId]
      );

      // Clone files (keep same file_url so history stays consistent)
      await pool.query(
        `INSERT INTO submission_files (submission_id, field_name, file_name, file_url, uploaded_at)
         SELECT $2, field_name, file_name, file_url, uploaded_at
         FROM submission_files
         WHERE submission_id = $1`,
        [fromSubmissionId, toSubmissionId]
      );
    };

    // Get or create the current draft submission for the customer.
    // If no draft exists, create one based on the latest submitted version (if any).
    let draftResult = await pool.query(
      `SELECT id FROM submissions
       WHERE customer_id = $1 AND status = 'draft'
       ORDER BY created_at DESC
       LIMIT 1`,
      [customer.id]
    );

    let submissionId: number;
    if (draftResult.rows.length > 0) {
      submissionId = draftResult.rows[0].id;
    } else {
      const latestSubmittedResult = await pool.query(
        `SELECT id FROM submissions
         WHERE customer_id = $1 AND status = 'submitted'
         ORDER BY version DESC NULLS LAST, submitted_at DESC NULLS LAST, created_at DESC
         LIMIT 1`,
        [customer.id]
      );

      const newDraft = await pool.query(
        'INSERT INTO submissions (customer_id, status, created_at) VALUES ($1, $2, NOW()) RETURNING id',
        [customer.id, 'draft']
      );
      submissionId = newDraft.rows[0].id;

      if (latestSubmittedResult.rows.length > 0) {
        await cloneSubmissionData(latestSubmittedResult.rows[0].id, submissionId);
      }
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
    fieldsResult.rows.forEach((row: any) => {
      try {
        fields[row.field_name] = JSON.parse(row.field_value);
      } catch (e) {
        // If parsing fails, use the value as-is (for backwards compatibility)
        fields[row.field_name] = row.field_value;
      }
    });

    const files: Record<string, any[]> = {};
    filesResult.rows.forEach((row: any) => {
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

    // Get or create draft submission
    const submissionResult = await pool.query(
      `SELECT id FROM submissions
       WHERE customer_id = $1 AND status = 'draft'
       ORDER BY created_at DESC
       LIMIT 1`,
      [customerId]
    );

    let submissionId: number;
    if (submissionResult.rows.length > 0) {
      submissionId = submissionResult.rows[0].id;
    } else {
      const newSubmission = await pool.query(
        'INSERT INTO submissions (customer_id, status, created_at) VALUES ($1, $2, NOW()) RETURNING id',
        [customerId, 'draft']
      );
      submissionId = newSubmission.rows[0].id;
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
      const USE_S3 = !!process.env.AWS_S3_BUCKET_NAME;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fieldName = fieldNames[file.originalname] || req.body.fieldName || 'general';
        
        let fileUrl: string;
        
        if (USE_S3) {
          // Upload to S3
          const fileKey = `${uuidv4()}${path.extname(file.originalname)}`;
          const fileBuffer = file.buffer;
          fileUrl = await uploadToS3(fileKey, fileBuffer, file.mimetype);
        } else {
          // Local filesystem (fallback for development)
          fileUrl = `/uploads/${file.filename}`;
        }

        // Tarkista, onko sama tiedosto jo tallennettu
        const existingFile = await pool.query(
          `SELECT id FROM submission_files 
           WHERE submission_id = $1 AND field_name = $2 AND file_name = $3`,
          [submissionId, fieldName, file.originalname]
        );

        // Tallenna vain jos tiedostoa ei ole jo tallennettu
        if (existingFile.rows.length === 0) {
          await pool.query(
            `INSERT INTO submission_files (submission_id, field_name, file_name, file_url)
             VALUES ($1, $2, $3, $4)`,
            [submissionId, fieldName, file.originalname, fileUrl]
          );
        }
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

    // Only allow deleting from the current draft (submitted versions must remain intact).
    const submissionResult = await pool.query(
      `SELECT id FROM submissions
       WHERE customer_id = $1 AND status = 'draft'
       ORDER BY created_at DESC
       LIMIT 1`,
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
    
    // Delete file reference from database only (do NOT delete the underlying file).
    // The same file_url can be referenced by older submitted versions.
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

    const cloneSubmissionData = async (fromSubmissionId: number, toSubmissionId: number) => {
      await pool.query(
        `INSERT INTO submission_fields (submission_id, field_name, field_value)
         SELECT $2, field_name, field_value
         FROM submission_fields
         WHERE submission_id = $1`,
        [fromSubmissionId, toSubmissionId]
      );
      await pool.query(
        `INSERT INTO submission_files (submission_id, field_name, file_name, file_url, uploaded_at)
         SELECT $2, field_name, file_name, file_url, uploaded_at
         FROM submission_files
         WHERE submission_id = $1`,
        [fromSubmissionId, toSubmissionId]
      );
    };

    // Get or create draft submission (this is what the customer edits).
    const draftResult = await pool.query(
      `SELECT id FROM submissions
       WHERE customer_id = $1 AND status = 'draft'
       ORDER BY created_at DESC
       LIMIT 1`,
      [customerId]
    );

    let submissionId: number;
    if (draftResult.rows.length > 0) {
      submissionId = draftResult.rows[0].id;
    } else {
      const newDraft = await pool.query(
        'INSERT INTO submissions (customer_id, status, created_at) VALUES ($1, $2, NOW()) RETURNING id',
        [customerId, 'draft']
      );
      submissionId = newDraft.rows[0].id;
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
      const USE_S3 = !!process.env.AWS_S3_BUCKET_NAME;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fieldName = fieldNames[file.originalname] || req.body.fieldName || 'general';
        
        let fileUrl: string;
        
        if (USE_S3) {
          // Upload to S3
          const fileKey = `${uuidv4()}${path.extname(file.originalname)}`;
          const fileBuffer = file.buffer;
          fileUrl = await uploadToS3(fileKey, fileBuffer, file.mimetype);
        } else {
          // Local filesystem (fallback for development)
          fileUrl = `/uploads/${file.filename}`;
        }

        // Tarkista, onko sama tiedosto jo tallennettu
        const existingFile = await pool.query(
          `SELECT id FROM submission_files 
           WHERE submission_id = $1 AND field_name = $2 AND file_name = $3`,
          [submissionId, fieldName, file.originalname]
        );

        // Tallenna vain jos tiedostoa ei ole jo tallennettu
        if (existingFile.rows.length === 0) {
          await pool.query(
            `INSERT INTO submission_files (submission_id, field_name, file_name, file_url)
             VALUES ($1, $2, $3, $4)`,
            [submissionId, fieldName, file.originalname, fileUrl]
          );
        }
      }
    }

    // Determine version + parent submission for history
    const parentSubmittedResult = await pool.query(
      `SELECT id, version FROM submissions
       WHERE customer_id = $1 AND status = 'submitted'
       ORDER BY version DESC NULLS LAST, submitted_at DESC NULLS LAST, created_at DESC
       LIMIT 1`,
      [customerId]
    );
    const parentSubmissionId: number | null = parentSubmittedResult.rows.length > 0 ? parentSubmittedResult.rows[0].id : null;

    const nextVersionResult = await pool.query(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next_version
       FROM submissions
       WHERE customer_id = $1 AND status = 'submitted'`,
      [customerId]
    );
    const nextVersion: number = Number(nextVersionResult.rows[0].next_version);

    // Mark the draft as submitted (this becomes the immutable version)
    await pool.query(
      `UPDATE submissions
       SET status = 'submitted',
           submitted_at = NOW(),
           version = $1,
           parent_submission_id = $2
       WHERE id = $3`,
      [nextVersion, parentSubmissionId, submissionId]
    );

    // Create a new draft cloned from the newly submitted version (so customer can later add more)
    const newDraftRes = await pool.query(
      'INSERT INTO submissions (customer_id, status, created_at) VALUES ($1, $2, NOW()) RETURNING id',
      [customerId, 'draft']
    );
    const newDraftId: number = newDraftRes.rows[0].id;
    await cloneSubmissionData(submissionId, newDraftId);

    // Send email to representative
    if (customer.edustaja_email) {
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const formUrl = `${frontendUrl}/submissions/${submissionId}`;
        
        console.log(`📧 Sending email notification for submission ${submissionId} to ${customer.edustaja_email}`);
        await sendFormSubmissionEmail({
          customerName: customer.name,
          customerEmail: customer.email,
          representativeEmail: customer.edustaja_email,
          formUrl: formUrl
        });
        console.log(`✅ Email notification sent successfully for submission ${submissionId}`);
      } catch (emailError: any) {
        // Log error but don't fail the submission
        console.error('❌ Failed to send email notification:', {
          error: emailError.message,
          stack: emailError.stack,
          representativeEmail: customer.edustaja_email,
          submissionId: submissionId
        });
        // Still return success, but log the email failure
      }
    } else {
      console.warn(`⚠️ No representative email found for customer ${customer.id}, skipping email notification`);
    }

    res.json({ success: true, submissionId, message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Submit form error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

