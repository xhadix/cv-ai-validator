import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Check if sample CV already exists
  const existingCV = await prisma.cV.findFirst({
    where: { email: 'john.doe@example.com' },
  });

  let sampleCV;
  
  if (existingCV) {
    console.log('✅ Sample CV already exists:', existingCV.fullName);
    sampleCV = existingCV;
  } else {
    // Create sample CV data
    sampleCV = await prisma.cV.create({
      data: {
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        skills: 'JavaScript, React, Node.js, TypeScript',
        experience: '5 years of full-stack development experience',
        pdfUrl: 'sample-cv.pdf',
      },
    });
    console.log('✅ Sample CV created:', sampleCV.fullName);
  }

  // Check if validation result already exists
  const existingValidation = await prisma.validationResult.findFirst({
    where: { cvId: sampleCV.id },
  });

  if (!existingValidation) {
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
  } else {
    console.log('✅ Sample validation result already exists');
  }

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
