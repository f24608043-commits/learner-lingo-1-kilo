import { db } from '../db';
import { profiles, tutorProfiles, sessionRequests, tutorAvailability } from '../db/schema';
import { eq } from 'drizzle-orm';

async function findExistingUsers() {
  console.log('Finding existing users for live testing...\n');

  // Find learners
  console.log('1. Finding learners...');
  const learners = await db
    .select()
    .from(profiles)
    .where(eq(profiles.role, 'learner'))
    .limit(5);

  console.log(`Found ${learners.length} learners:`);
  learners.forEach((l, i) => {
    console.log(`  ${i + 1}. ID: ${l.id}, Name: ${l.displayName}, XP: ${l.xp}`);
  });

  // Find tutors with profiles
  console.log('\n2. Finding tutors with profiles...');
  const tutorsWithProfiles = await db
    .select({
      tutorId: tutorProfiles.tutorId,
      displayName: profiles.displayName,
      bio: tutorProfiles.bio,
      subjects: tutorProfiles.subjects,
    })
    .from(tutorProfiles)
    .innerJoin(profiles, eq(tutorProfiles.tutorId, profiles.id))
    .limit(5);

  console.log(`Found ${tutorsWithProfiles.length} tutors with profiles:`);
  tutorsWithProfiles.forEach((t, i) => {
    console.log(`  ${i + 1}. ID: ${t.tutorId}, Name: ${t.displayName}, Subjects: ${t.subjects}`);
  });

  // Find tutors without profiles (for profile creation test)
  console.log('\n3. Finding tutors without profiles...');
  const tutorsWithoutProfiles = await db
    .select()
    .from(profiles)
    .where(eq(profiles.role, 'tutor'))
    .limit(5);

  const tutorIdsWithProfiles = tutorsWithProfiles.map(t => t.tutorId);
  const tutorsWithoutProfilesFiltered = tutorsWithoutProfiles.filter(
    t => !tutorIdsWithProfiles.includes(t.id)
  );

  console.log(`Found ${tutorsWithoutProfilesFiltered.length} tutors without profiles:`);
  tutorsWithoutProfilesFiltered.forEach((t, i) => {
    console.log(`  ${i + 1}. ID: ${t.id}, Name: ${t.displayName}`);
  });

  // Check for existing session requests
  console.log('\n4. Finding recent session requests...');
  const recentRequests = await db
    .select()
    .from(sessionRequests)
    .limit(3);

  console.log(`Found ${recentRequests.length} recent session requests:`);
  recentRequests.forEach((r, i) => {
    console.log(`  ${i + 1}. ID: ${r.id}, Learner: ${r.learnerId}, Tutor: ${r.tutorId}, Status: ${r.status}`);
  });

  // Check for tutor availability
  console.log('\n5. Finding tutor availability records...');
  const availability = await db
    .select()
    .from(tutorAvailability)
    .limit(3);

  console.log(`Found ${availability.length} tutor availability records:`);
  availability.forEach((a, i) => {
    console.log(`  ${i + 1}. ID: ${a.id}, Tutor: ${a.tutorId}, Created: ${a.createdAt}`);
  });

  console.log('\n✅ Query complete!');
}

findExistingUsers().catch(console.error);
