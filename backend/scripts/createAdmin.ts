import bcrypt from 'bcryptjs';
import { pool } from '../src/db';
import dotenv from 'dotenv';

dotenv.config();

async function createAdmin() {
  const email = process.argv[2] || 'admin@sievitalo.fi';
  const password = process.argv[3] || 'admin123';

  try {
    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      console.log(`❌ Käyttäjä ${email} on jo olemassa.`);
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email, passwordHash, 'admin']
    );

    console.log('✅ Admin-käyttäjä luotu onnistuneesti!');
    console.log(`   Email: ${result.rows[0].email}`);
    console.log(`   Rooli: ${result.rows[0].role}`);
    console.log(`   ID: ${result.rows[0].id}`);
    console.log(`\n   Salasana: ${password}`);
    console.log('   ⚠️  Muista vaihtaa salasana ensimmäisellä kirjautumisella!');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Virhe admin-käyttäjän luomisessa:', error.message);
    process.exit(1);
  }
}

createAdmin();





