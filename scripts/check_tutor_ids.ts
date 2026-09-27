import { db } from "../db";
import { tutorProfiles, profiles } from "../db/schema";
import { eq } from "drizzle-orm";

async function checkTutorIds() {
  const allTutorProfiles = await db.select().from(tutorProfiles);
  
  console.log("=== ALL TUTOR PROFILES ===");
  console.log(`Total count: ${allTutorProfiles.length}`);
  
  for (const tp of allTutorProfiles) {
    console.log(`\nTutor Profile ID: ${tp.id}`);
    console.log(`Tutor ID (profiles.id): ${tp.tutorId}`);
    console.log(`Display Name: ${tp.displayName || 'N/A'}`);
    
    // Check if this tutorId exists in profiles
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, tp.tutorId));
    if (profile) {
      console.log(`✓ Profile exists in profiles table: ${profile.displayName}`);
    } else {
      console.log(`✗ Profile NOT FOUND in profiles table for tutorId: ${tp.tutorId}`);
    }
  }
  
  process.exit(0);
}

checkTutorIds().catch(console.error);
