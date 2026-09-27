import { db } from '../db';
import { tutorProfiles } from '../db/schema';
import { eq } from 'drizzle-orm';

async function deleteTutorProfile() {
  const tutorId = 'a8b34bb1-dbc1-421a-b8c1-34429e4e29cd';
  
  console.log('Deleting tutor profile for test...');
  
  await db.delete(tutorProfiles).where(eq(tutorProfiles.tutorId, tutorId));
  
  console.log('✅ Tutor profile deleted');
}

deleteTutorProfile().catch(console.error);
