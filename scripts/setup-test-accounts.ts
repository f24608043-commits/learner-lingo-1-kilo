import { createClient } from '@supabase/supabase-js';
import { db } from '../db';
import { profiles, tutorProfiles } from '../db/schema';
import { eq } from 'drizzle-orm';

async function setupTestAccounts() {
  console.log('Setting up test accounts for live testing...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Create test learner
  const learnerEmail = 'testlearner+test@gmail.com';
  const learnerPassword = 'Test123456!';
  
  console.log('1. Creating test learner account...');
  const { data: learnerData, error: learnerError } = await supabase.auth.signUp({
    email: learnerEmail,
    password: learnerPassword,
  });

  if (learnerError && !learnerError.message.includes('already registered')) {
    console.error('Error creating learner:', learnerError);
  } else {
    console.log('✅ Learner account created or already exists');
    console.log('   Email:', learnerEmail);
    console.log('   Password:', learnerPassword);
    
    if (learnerData.user) {
      // Create profile if needed
      const [existingProfile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, learnerData.user.id))
        .limit(1);
      
      if (!existingProfile) {
        await db.insert(profiles).values({
          id: learnerData.user.id,
          displayName: 'Test Learner',
          role: 'learner',
          xp: 0,
          streakCount: 0,
        });
        console.log('   Profile created');
      }
    }
  }

  // Create test tutor (without profile initially)
  const tutorEmail = 'testtutor+test@gmail.com';
  const tutorPassword = 'Test123456!';
  
  console.log('\n2. Creating test tutor account (without profile)...');
  const { data: tutorData, error: tutorError } = await supabase.auth.signUp({
    email: tutorEmail,
    password: tutorPassword,
  });

  if (tutorError && !tutorError.message.includes('already registered')) {
    console.error('Error creating tutor:', tutorError);
  } else {
    console.log('✅ Tutor account created or already exists');
    console.log('   Email:', tutorEmail);
    console.log('   Password:', tutorPassword);
    
    if (tutorData.user) {
      // Create profile if needed (but NOT tutor profile)
      const [existingProfile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, tutorData.user.id))
        .limit(1);
      
      if (!existingProfile) {
        await db.insert(profiles).values({
          id: tutorData.user.id,
          displayName: 'Test Tutor New',
          role: 'tutor',
          xp: 0,
          streakCount: 0,
        });
        console.log('   Profile created (without tutor profile)');
      }

      // Delete any existing tutor profile to ensure clean state
      await db.delete(tutorProfiles).where(eq(tutorProfiles.tutorId, tutorData.user.id));
      console.log('   Tutor profile deleted (for clean test)');
      
      console.log('\n📝 Environment variables for Playwright tests:');
      console.log('TEST_LEARNER_EMAIL=' + learnerEmail);
      console.log('TEST_LEARNER_PASSWORD=' + learnerPassword);
      console.log('TEST_TUTOR_EMAIL=' + tutorEmail);
      console.log('TEST_TUTOR_PASSWORD=' + tutorPassword);
      console.log('TEST_TUTOR_ID=' + tutorData.user.id);
    }
  }

  // Get an existing tutor with profile for availability test
  console.log('\n3. Finding existing tutor with profile for availability test...');
  const [tutorWithProfile] = await db
    .select({ tutorId: tutorProfiles.tutorId })
    .from(tutorProfiles)
    .limit(1);

  if (tutorWithProfile) {
    console.log('✅ Found tutor with profile');
    console.log('   TEST_TUTOR_WITH_PROFILE_ID=' + tutorWithProfile.tutorId);
  } else {
    console.log('⚠️  No tutor with profile found. You may need to create one manually.');
  }

  console.log('\n✅ Setup complete!');
}

setupTestAccounts().catch(console.error);
