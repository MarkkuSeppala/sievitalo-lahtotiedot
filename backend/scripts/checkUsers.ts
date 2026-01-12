import { pool } from '../src/db';
import dotenv from 'dotenv';

dotenv.config();

async function checkUsers() {
  try {
    console.log('🔍 Tarkistetaan käyttäjät tietokannasta...\n');

    const result = await pool.query('SELECT id, email, role, created_at FROM users ORDER BY created_at');

    if (result.rows.length === 0) {
      console.log('❌ Tietokannassa ei ole yhtään käyttäjää!');
      console.log('\n💡 Luo admin-käyttäjä komennolla:');
      console.log('   docker-compose exec backend npm run create-admin');
      process.exit(1);
    }

    console.log(`✅ Löytyi ${result.rows.length} käyttäjää:\n`);

    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Rooli: ${user.role}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Luotu: ${new Date(user.created_at).toLocaleString('fi-FI')}`);
      console.log('');
    });

    // Check for admin users
    const adminUsers = result.rows.filter((u: any) => u.role === 'admin');
    if (adminUsers.length === 0) {
      console.log('⚠️  Varoitus: Tietokannassa ei ole admin-käyttäjiä!');
      console.log('💡 Luo admin-käyttäjä komennolla:');
      console.log('   docker-compose exec backend npm run create-admin');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Virhe käyttäjien tarkistuksessa:', error.message);
    process.exit(1);
  }
}

checkUsers();





