import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@gmail.com' },
      select: { id: true, email: true, username: true, role: true, isActive: true, createdAt: true },
    });

    if (user) {
      console.log('Admin user found:');
      console.log(user);
    } else {
      console.log('Admin user not found.');
    }
  } catch (e) {
    console.error('Error verifying admin:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
