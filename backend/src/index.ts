import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { pool } from './db';
import authRoutes from './routes/auth';
import customerRoutes from './routes/customers';
import submissionRoutes from './routes/submissions';
import formRoutes from './routes/form';

dotenv.config();

// Run migrations on startup
async function runMigrations() {
  try {
    const migrationsDir = path.join(__dirname, '../migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).sort();
      for (const file of files) {
        if (file.endsWith('.sql')) {
          const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
          await pool.query(sql);
          console.log(`Migration completed: ${file}`);
        }
      }
    }
  } catch (error: any) {
    // Ignore "already exists" errors
    if (!error.message.includes('already exists')) {
      console.error('Migration error:', error);
    }
  }
}

async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const role = (process.env.ADMIN_ROLE || 'admin').trim();

  if (!email || !password) return;
  if (role !== 'admin') {
    console.warn(`⚠️  ADMIN_ROLE is "${role}" (expected "admin"). Skipping admin seed.`);
    return;
  }

  try {
    const existing = await pool.query('SELECT id, email, role FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log(`ℹ️  Admin seed: user already exists (${existing.rows[0].email}, role: ${existing.rows[0].role})`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email, passwordHash, 'admin']
    );

    console.log(`✅ Admin seed: created user ${created.rows[0].email} (role: ${created.rows[0].role})`);
  } catch (error: any) {
    // Don't crash the server on seed errors; log and continue.
    console.error('❌ Admin seed error:', error?.message || error);
  }
}

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3000'),
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Root endpoint for Render / load balancer probes
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'lahtotiedot-backend' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/form', formRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
runMigrations().then(() => {
  seedAdminUser().finally(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Server accessible at http://localhost:${PORT}`);
    });
  });
});

