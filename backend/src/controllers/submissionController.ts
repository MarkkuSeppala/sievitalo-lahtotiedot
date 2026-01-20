import { Response } from 'express';
import { pool } from '../db';
import { AuthRequest } from '../middleware/auth';
import PDFDocument from 'pdfkit';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { downloadFromS3 } from '../services/s3Service';

export const getSubmissions = async (req: AuthRequest, res: Response) => {
  try {
    let query = `
      SELECT s.id, s.status, s.submitted_at, s.created_at, s.version, s.parent_submission_id,
             c.name as customer_name, c.email as customer_email, c.token
      FROM submissions s
      JOIN customers c ON s.customer_id = c.id
    `;
    const params: any[] = [];

    // Designers/admins should only see actual submitted deliveries, not drafts.
    // Edustaja should also see submitted only to avoid draft spam (a draft is always created after submit).
    query += ' WHERE s.status = $1';
    params.push('submitted');

    if (req.user?.role === 'edustaja') {
      query += ' AND c.edustaja_id = $2';
      params.push(req.user.id);
    }

    query += ' ORDER BY s.submitted_at DESC NULLS LAST, s.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ submissions: result.rows });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSubmissionChanges = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get submission + customer
    const submissionResult = await pool.query(
      `SELECT s.*, c.name as customer_name, c.email as customer_email, c.token, c.edustaja_id
       FROM submissions s
       JOIN customers c ON s.customer_id = c.id
       WHERE s.id = $1`,
      [id]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionResult.rows[0];

    // Check permissions
    if (req.user?.role === 'edustaja') {
      if (submission.edustaja_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const parentId: number | null = submission.parent_submission_id || null;
    if (!parentId) {
      return res.json({
        isFirstSubmission: true,
        parentSubmissionId: null,
        fieldsChanged: [],
        filesAdded: [],
        filesRemoved: []
      });
    }

    const stableStringify = (value: any): string => {
      if (value === null || value === undefined) return String(value);
      if (typeof value !== 'object') return JSON.stringify(value);
      if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
      const keys = Object.keys(value).sort();
      return `{${keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',')}}`;
    };

    const parseFieldValue = (raw: any) => {
      if (raw === null || raw === undefined) return raw;
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      }
      return raw;
    };

    // Fields maps
    const [curFieldsRes, prevFieldsRes] = await Promise.all([
      pool.query('SELECT field_name, field_value FROM submission_fields WHERE submission_id = $1', [id]),
      pool.query('SELECT field_name, field_value FROM submission_fields WHERE submission_id = $1', [parentId])
    ]);

    const curFields = new Map<string, any>();
    for (const row of curFieldsRes.rows) {
      curFields.set(row.field_name, parseFieldValue(row.field_value));
    }
    const prevFields = new Map<string, any>();
    for (const row of prevFieldsRes.rows) {
      prevFields.set(row.field_name, parseFieldValue(row.field_value));
    }

    const allFieldNames = new Set<string>([...curFields.keys(), ...prevFields.keys()]);
    const fieldsChanged: Array<{ field: string; oldValue: any; newValue: any }> = [];
    for (const field of Array.from(allFieldNames).sort()) {
      const oldValue = prevFields.get(field);
      const newValue = curFields.get(field);
      if (stableStringify(oldValue) !== stableStringify(newValue)) {
        fieldsChanged.push({ field, oldValue, newValue });
      }
    }

    // Files diff (by field_name + file_name + file_url)
    const [curFilesRes, prevFilesRes] = await Promise.all([
      pool.query('SELECT field_name, file_name, file_url FROM submission_files WHERE submission_id = $1', [id]),
      pool.query('SELECT field_name, file_name, file_url FROM submission_files WHERE submission_id = $1', [parentId])
    ]);

    const keyOf = (r: any) => `${r.field_name}::${r.file_name}::${r.file_url}`;
    const curKeys = new Set(curFilesRes.rows.map(keyOf));
    const prevKeys = new Set(prevFilesRes.rows.map(keyOf));

    const filesAdded = curFilesRes.rows
      .filter((r: any) => !prevKeys.has(keyOf(r)))
      .map((r: any) => ({ fieldName: r.field_name, fileName: r.file_name, url: r.file_url }));

    const filesRemoved = prevFilesRes.rows
      .filter((r: any) => !curKeys.has(keyOf(r)))
      .map((r: any) => ({ fieldName: r.field_name, fileName: r.file_name, url: r.file_url }));

    res.json({
      isFirstSubmission: false,
      parentSubmissionId: parentId,
      fieldsChanged,
      filesAdded,
      filesRemoved
    });
  } catch (error) {
    console.error('Get submission changes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSubmissionById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get submission
    const submissionResult = await pool.query(
      `SELECT s.*, c.name as customer_name, c.email as customer_email, c.token
       FROM submissions s
       JOIN customers c ON s.customer_id = c.id
       WHERE s.id = $1`,
      [id]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionResult.rows[0];

    // Check permissions
    if (req.user?.role === 'edustaja') {
      const customerResult = await pool.query(
        'SELECT edustaja_id FROM customers WHERE id = $1',
        [submission.customer_id]
      );
      if (customerResult.rows[0]?.edustaja_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get fields
    const fieldsResult = await pool.query(
      'SELECT field_name, field_value FROM submission_fields WHERE submission_id = $1',
      [id]
    );

    // Get files
    const filesResult = await pool.query(
      'SELECT id, field_name, file_name, file_url FROM submission_files WHERE submission_id = $1',
      [id]
    );

    const fields: Record<string, any> = {};
    fieldsResult.rows.forEach((row: any) => {
      try {
        // Parse JSON if it's a string, otherwise use as-is
        if (typeof row.field_value === 'string') {
          fields[row.field_name] = JSON.parse(row.field_value);
        } else {
          fields[row.field_name] = row.field_value;
        }
      } catch (e) {
        console.error(`Error parsing field ${row.field_name}:`, e);
        // If parsing fails, use the value as-is
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
      submission: {
        ...submission,
        fields,
        files
      }
    });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const exportSubmissionPDF = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get submission data (same as getSubmissionById)
    const submissionResult = await pool.query(
      `SELECT s.*, c.name as customer_name, c.email as customer_email
       FROM submissions s
       JOIN customers c ON s.customer_id = c.id
       WHERE s.id = $1`,
      [id]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionResult.rows[0];

    // Get fields and files
    const fieldsResult = await pool.query(
      'SELECT field_name, field_value FROM submission_fields WHERE submission_id = $1',
      [id]
    );

    const filesResult = await pool.query(
      'SELECT id, field_name, file_name, file_url FROM submission_files WHERE submission_id = $1',
      [id]
    );

    // Create PDF with margins
    const margin = 50;
    const doc = new PDFDocument({
      margins: {
        top: margin,
        bottom: margin,
        left: margin,
        right: margin
      }
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=submission-${id}.pdf`);

    doc.pipe(res);

    // Calculate text width (page width minus margins)
    const textWidth = doc.page.width - (margin * 2);
    const lineGap = 4;

    // Helper function to check if we need a new page
    const checkPageBreak = (requiredHeight: number = 20) => {
      if (doc.y + requiredHeight > doc.page.height - margin) {
        doc.addPage();
      }
    };

    // Header
    checkPageBreak(40);
    doc.fontSize(20).text('Suunnittelun lähtötiedot', { align: 'center', width: textWidth });
    doc.moveDown();
    checkPageBreak(60);
    doc.fontSize(12);
    doc.text(`Asiakas: ${submission.customer_name}`, { width: textWidth, lineGap });
    doc.text(`Sähköposti: ${submission.customer_email}`, { width: textWidth, lineGap });
    doc.text(`Lähetetty: ${submission.submitted_at ? new Date(submission.submitted_at).toLocaleString('fi-FI') : 'Ei lähetetty'}`, { width: textWidth, lineGap });
    doc.moveDown();

    // Mapping of field names to human-readable labels
    const FIELD_LABELS: Record<string, string> = {
      vesi_viemari_liitos: 'Vesi- ja viemäriliitoskohtalausunto ja johtokartta',
      sokkelin_korko: 'Sokkelin korko',
      talousrakennus_ulkomitat: 'Talousrakennus ulkomitat',
      sahko_liittymiskohta: 'Sähköliittymiskohta',
      radonin_torjunta: 'Radonin torjunta',
      sahkoverkkoyhtio: 'Sähköverkkoyhtiö',
      paasulakekoko: 'Pääsulakekoko',
      lamponlahde: 'Lämmönlähde',
      viemarointi: 'Viemäröinti',
      salaoja_sadevesi: 'Salaoja ja sadevesi'
    };

    // Fields
    checkPageBreak(30);
    doc.fontSize(16).text('Vastaukset:', { underline: true, width: textWidth });
    doc.moveDown();

    fieldsResult.rows.forEach((row: any) => {
      // Use custom label if available, otherwise format automatically
      const fieldName = FIELD_LABELS[row.field_name] || row.field_name.replace(/_/g, ' ');
      const fieldValue = JSON.parse(row.field_value);
      const fieldValueText = Array.isArray(fieldValue) ? fieldValue.join(', ') : String(fieldValue);
      
      // Check if we need a new page before adding this field
      checkPageBreak(30);
      
      // Combine label and value in one text call for proper wrapping
      doc.fontSize(12);
      doc.text(`${fieldName}: ${fieldValueText}`, { 
        width: textWidth, 
        lineGap 
      });
      doc.moveDown();
    });

    // Mapping of file field names to human-readable labels
    const FILE_FIELD_LABELS: Record<string, string> = {
      kaavaote: 'Kaavaote, kaavamääräykset, rakentamistapaohjeet',
      tonttikartta: 'Virallinen tonttikartta asemapiirroksen laatimista varten myös sähköisenä dwg-muodossa',
      vesi_viemari_lausunto: 'Mikäli vesi- ja viemäriliitoskohtalausunto ja johtokartta tarvitaan, lataa dokumentit tässä.',
      sijoitusluonnos: 'Sijoitusluonnos',
      pohjatutkimus: 'Pohjatutkimusaineisto (maaperätutkimus ja perustamistapalausunto)',
      sahko_sijoitusluonnos: 'Sijoitusluonnos sähköasemapiirrosta varten.',
      general: 'Yleiset tiedostot'
    };

    // Files
    if (filesResult.rows.length > 0) {
      checkPageBreak(30);
      doc.moveDown();
      doc.fontSize(16).text('Tiedostot:', { underline: true, width: textWidth });
      doc.moveDown();

      filesResult.rows.forEach((row: any) => {
        // Use custom label if available, otherwise format automatically
        const fieldName = FILE_FIELD_LABELS[row.field_name] || row.field_name.replace(/_/g, ' ');
        
        // Check if we need a new page before adding this file entry
        checkPageBreak(20);
        
        doc.fontSize(12);
        doc.text(`${fieldName}: ${row.file_name}`, { 
          width: textWidth, 
          lineGap 
        });
        doc.moveDown();
      });
    }

    doc.end();
  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const exportSubmissionZip = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get submission
    const submissionResult = await pool.query(
      `SELECT s.*, c.name as customer_name, c.email as customer_email, c.edustaja_id
       FROM submissions s
       JOIN customers c ON s.customer_id = c.id
       WHERE s.id = $1`,
      [id]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionResult.rows[0];

    // Check permissions
    if (req.user?.role === 'edustaja') {
      if (submission.edustaja_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get all files
    const filesResult = await pool.query(
      'SELECT id, field_name, file_name, file_url FROM submission_files WHERE submission_id = $1',
      [id]
    );

    if (filesResult.rows.length === 0) {
      return res.status(404).json({ error: 'No files found for this submission' });
    }

    // Track file names to handle duplicates
    const fileNameCounts = new Map<string, number>();
    const USE_S3 = !!process.env.AWS_S3_BUCKET_NAME;
    const uploadDir = process.env.UPLOAD_DIR || './uploads';

    // Set up zip archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="submission-${id}-files.zip"`);

    // Pipe archive to response
    archive.pipe(res);

    // Process each file
    for (const file of filesResult.rows) {
      let fileBuffer: Buffer;
      let fileName = file.file_name;

      // Determine file path/URL
      const fileUrl = file.file_url;

      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        // S3 file - download from S3
        try {
          fileBuffer = await downloadFromS3(fileUrl);
        } catch (error) {
          console.error(`Error downloading file ${fileUrl} from S3:`, error);
          continue; // Skip this file if download fails
        }
      } else if (fileUrl.startsWith('/uploads/')) {
        // Local filesystem file
        const filePath = path.join(uploadDir, path.basename(fileUrl));
        try {
          if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            continue; // Skip this file if it doesn't exist
          }
          fileBuffer = fs.readFileSync(filePath);
        } catch (error) {
          console.error(`Error reading file ${filePath}:`, error);
          continue; // Skip this file if read fails
        }
      } else {
        console.error(`Unknown file URL format: ${fileUrl}`);
        continue; // Skip this file
      }

      // Handle duplicate file names by adding field_name prefix
      const count = fileNameCounts.get(fileName) || 0;
      fileNameCounts.set(fileName, count + 1);

      let zipEntryName: string;
      if (count > 0) {
        // Duplicate name - add field_name prefix
        zipEntryName = `${file.field_name}_${fileName}`;
      } else {
        zipEntryName = fileName;
      }

      // Add file to zip archive
      archive.append(fileBuffer, { name: zipEntryName });
    }

    // Finalize the archive
    await archive.finalize();
  } catch (error) {
    console.error('Export ZIP error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};