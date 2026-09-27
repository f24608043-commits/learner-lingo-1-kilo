import { db } from '../db';
import { profiles } from '../db/schema';
import { eq } from 'drizzle-orm';

async function getUserIds() {
  console.log('Getting user IDs for test accounts...\n');

  // Get learner ID
  const [learner] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.displayName, 'Test Learner'))
    .limit(1);

  if (learner) {
    console.log('✅ Learner found:');
    console.log('   ID:', learner.id);
    console.log('   Name:', learner.displayName);
    console.log('   Role:', learner.role);
    console.log('\n📝 Set this environment variable:');
    console.log('TEST_LEARNER_ID=' + learner.id);
  } else {
    console.log('❌ Learner not found');
  }

  // Get tutor ID (without profile)
  const [tutor] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.displayName, 'Test Tutor New'))
    .limit(1);

  if (tutor) {
    console.log('\n✅ Tutor (without profile) found:');
    console.log('   ID:', tutor.id);
    console.log('   Name:', tutor.displayName);
    console.log('   Role:', tutor.role);
  } else {
    console.log('\n❌ Tutor not found');
  }
}

getUserIds().catch(console.error);
