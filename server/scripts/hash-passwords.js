/* Usage:  node scripts/hash-passwords.js admin123 manager123 coord123 */
import bcrypt from 'bcryptjs';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/hash-passwords.js <pwd1> <pwd2> ...');
  process.exit(1);
}

for (const pwd of args) {
  const hash = await bcrypt.hash(pwd, 10);
  console.log(`"${pwd}"  →  ${hash}`);
}