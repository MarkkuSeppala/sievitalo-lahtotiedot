import { Response } from 'express';
import { pool } from '../db';
import { AuthRequest } from '../middleware/auth';
import PDFDocument from 'pdfkit';

export const getSubmissions = async (req: AuthRequest, res: Response) => {
  try {
    let query = `
      SELECT s.id, s.status, s.submitted_at, s.created_at,
             c.name as customer_name, c.email as customer_email, c.token
      FROM submissions s
      JOIN customers c ON s.customer_id = c.id
    `;
    const params: any[] = [];

    if (req.user?.role === 'edustaja') {
      query += ' WHERE c.edustaja_id = $1';
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

    // Create PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=submission-${id}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Suunnittelun lähtötiedot', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Asiakas: ${submission.customer_name}`);
    doc.text(`Sähköposti: ${submission.customer_email}`);
    doc.text(`Lähetetty: ${submission.submitted_at ? new Date(submission.submitted_at).toLocaleString('fi-FI') : 'Ei lähetetty'}`);
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
    doc.fontSize(16).text('Vastaukset:', { underline: true });
    doc.moveDown();

    fieldsResult.rows.forEach((row: any) => {
      // Use custom label if available, otherwise format automatically
      const fieldName = FIELD_LABELS[row.field_name] || row.field_name.replace(/_/g, ' ');
      const fieldValue = JSON.parse(row.field_value);
      doc.fontSize(12).text(`${fieldName}:`, { continued: true });
      doc.text(Array.isArray(fieldValue) ? fieldValue.join(', ') : String(fieldValue));
      doc.moveDown(0.5);
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
      doc.moveDown();
      doc.fontSize(16).text('Tiedostot:', { underline: true });
      doc.moveDown();

      filesResult.rows.forEach((row: any) => {
        // Use custom label if available, otherwise format automatically
        const fieldName = FILE_FIELD_LABELS[row.field_name] || row.field_name.replace(/_/g, ' ');
        doc.fontSize(12).text(`${fieldName}: ${row.file_name}`);
      });
    }

    doc.end();
  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

