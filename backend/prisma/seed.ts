import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // No-op seed by default. Optionally create an initial admin user
  // when SEED_ADMIN_EMAIL, SEED_ADMIN_USERNAME, and SEED_ADMIN_PASSWORD are provided.
  const email = process.env.SEED_ADMIN_EMAIL;
  const username = process.env.SEED_ADMIN_USERNAME;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (email && username && password) {
    // Avoid creating duplicates
    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    const existingByUsername = await prisma.user.findUnique({ where: { username } });

    if (existingByEmail || existingByUsername) {
      console.log('Seed: admin already exists (email or username). Skipping creation.');
    } else {
      const hashed = password.startsWith('$2')
        ? password
        : await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: {
          email,
          username,
          password: hashed,
          role: 'ADMIN',
          isActive: true,
        },
      });
      console.log(`Seed: admin user created (${email})`);
    }
  } else {
    console.log(
      'Seed: no-op (set SEED_ADMIN_EMAIL, SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD to create an initial admin).',
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
