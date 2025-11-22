const bcrypt = require('bcryptjs');

async function createAdminUser() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || null;
  const role = process.argv[5] || 'admin';

  if (!email || !password) {
    console.log('Usage: node createAdmin.js <email> <password> [name] [role]');
    console.log('Example: node createAdmin.js admin@example.com mypassword "Admin User" super_admin');
    process.exit(1);
  }

  try {
    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    console.log('✅ Admin user credentials generated:');
    console.log('📧 Email:', email);
    console.log('🔑 Password Hash:', passwordHash);
    console.log('👤 Name:', name || 'Not specified');
    console.log('🎭 Role:', role);
    console.log('');
    console.log('📝 SQL to insert into database:');
    console.log('INSERT INTO admins (email, password_hash, name, role, is_active) VALUES (');
    console.log(`  '${email.toLowerCase()}',`);
    console.log(`  '${passwordHash}',`);
    console.log(`  ${name ? `'${name}'` : 'NULL'},`);
    console.log(`  '${role}',`);
    console.log('  true');
    console.log(');');
    console.log('');
    console.log('⚠️  Make sure to use a strong password in production!');

  } catch (error) {
    console.error('❌ Error generating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
