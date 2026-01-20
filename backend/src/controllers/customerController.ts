import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db';
import { AuthRequest } from '../middleware/auth';

export const createCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, name1, name2 } = req.body;
    const userId = req.user?.id;

    if (!name || !email || !name1) {
      return res.status(400).json({ error: 'Name, email, and name1 required' });
    }

    if (req.user?.role !== 'edustaja' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only edustaja and admin can create customers' });
    }

    // Generate unique token
    const token = uuidv4();

    const result = await pool.query(
      `INSERT INTO customers (name, email, token, edustaja_id, name1, name2, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, name, email, token, name1, name2, created_at`,
      [name, email, token, userId, name1, name2 || null]
    );

    res.status(201).json({
      customer: result.rows[0],
      formUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/form/${token}`
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCustomers = async (req: AuthRequest, res: Response) => {
  try {
    let query = `
      SELECT c.id, c.name, c.email, c.token, c.created_at,
             COUNT(s.id) FILTER (WHERE s.status = 'submitted') as submission_count,
             MAX(s.submitted_at) FILTER (WHERE s.status = 'submitted') as last_submission
      FROM customers c
      LEFT JOIN submissions s ON c.id = s.customer_id
    `;
    const params: any[] = [];

    // Edustaja sees only their customers, suunnittelija and admin see all
    if (req.user?.role === 'edustaja') {
      query += ' WHERE c.edustaja_id = $1';
      params.push(req.user.id);
    }

    query += ' GROUP BY c.id ORDER BY c.created_at DESC';

    const result = await pool.query(query, params);

    res.json({ customers: result.rows });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCustomerByToken = async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.params;

    const result = await pool.query(
      `SELECT c.*, u.email as edustaja_email
       FROM customers c
       LEFT JOIN users u ON c.edustaja_id = u.id
       WHERE c.token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ customer: result.rows[0] });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCustomerSubmissions = async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.params;

    const submissionsResult = await pool.query(
      `SELECT s.*, c.name as customer_name, c.email as customer_email
       FROM submissions s
       JOIN customers c ON s.customer_id = c.id
       WHERE c.token = $1 AND s.status = 'submitted'
       ORDER BY s.version DESC NULLS LAST, s.submitted_at DESC NULLS LAST, s.created_at DESC`,
      [token]
    );

    const submissions = await Promise.all(
      submissionsResult.rows.map(async (submission: any) => {
        // Get fields
        const fieldsResult = await pool.query(
          'SELECT field_name, field_value FROM submission_fields WHERE submission_id = $1',
          [submission.id]
        );

        // Get files
        const filesResult = await pool.query(
          'SELECT id, field_name, file_name, file_url FROM submission_files WHERE submission_id = $1',
          [submission.id]
        );

        const fields: Record<string, any> = {};
        fieldsResult.rows.forEach((row: any) => {
          fields[row.field_name] = JSON.parse(row.field_value);
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

        return {
          ...submission,
          fields,
          files
        };
      })
    );

    res.json({ submissions });
  } catch (error) {
    console.error('Get customer submissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if customer exists
    const customerResult = await pool.query('SELECT id FROM customers WHERE id = $1', [id]);
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Delete customer (CASCADE will delete submissions, fields, and files)
    await pool.query('DELETE FROM customers WHERE id = $1', [id]);

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

