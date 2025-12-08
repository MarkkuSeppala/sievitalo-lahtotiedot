import bcrypt from 'bcryptjs';
import { pool } from '../src/db';
import dotenv from 'dotenv';

dotenv.config();

async function resetPassword() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.log('❌ Käyttö: npm run reset-password <email> <uusi_salasana>');
    console.log('   Esimerkki: npm run reset-password admin@sievitalo.fi uusisalasana123');
    process.exit(1);
  }

  try {
    // Check if user exists
    const userResult = await pool.query('SELECT id, email, role FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      console.log(`❌ Käyttäjää ${email} ei löydy tietokannasta.`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`🔍 Löytyi käyttäjä: ${user.email} (${user.role})`);

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [passwordHash, email]
    );

    console.log('✅ Salasana vaihdettu onnistuneesti!');
    console.log(`   Email: ${email}`);
    console.log(`   Uusi salasana: ${newPassword}`);
    console.log('   ⚠️  Muista vaihtaa salasana turvallisemmaksi!');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Virhe salasanan vaihdossa:', error.message);
    process.exit(1);
  }
}

resetPassword();
