import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample CV data
  const sampleCV = await prisma.cV.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      skills: 'JavaScript, React, Node.js, TypeScript',
      experience: '5 years of full-stack development experience',
      pdfUrl: 'sample-cv.pdf',
    },
  });

  console.log('✅ Sample CV created:', sampleCV.fullName);

  // Create sample validation result
  const validationResult = await prisma.validationResult.create({
    data: {
      cvId: sampleCV.id,
      isValid: true,
      mismatches: [],
      message: 'All fields match the PDF content',
    },
  });

  console.log('✅ Sample validation result created');

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
