import { db } from '../db';
import { tutorProfiles } from '../db/schema';
import { eq } from 'drizzle-orm';

async function addTutorProfile() {
  console.log('Adding tutor profile for test账户...\n');

  const tutorId = 'a8b34bb1-dbc1-421a-b8c1-34429e4e29cd'; // From setup script output

  // Check if profile already exists
  const [existing] = await db
    .select()
    .from(tutorProfiles)
    .where(eq(tutorProfiles.tutorId, tutorId))
    .limit(1);

  if (existing) {
    console.log('Tutor profile already exists, deleting it first...');
    await db.delete(tutorProfiles).where(eq(tutorProfiles.tutorId, tutorId));
  }

  // Create tutor profile
  await db.insert(tutorProfiles).values({
    tutorId: tutorId,
    bio: 'Experienced tutor specializing in Python, JavaScript, and React. Patient and knowledgeable.',
    subjects: ['Python', 'JavaScript', 'React', 'Next.js'],
    hourlyRate: 50,
    isActive: true,
  });

  console.log('✅ Tutor profile created successfully!');
  console.log('   Tutor ID:', tutorId);
  console.log('   Subjects: Python, JavaScript, React, Next.js');
  console.log('   Hourly Rate: $50');
}

addTutorProfile().catch(console.error);
