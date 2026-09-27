import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dbusfzzwtpsmcaypmykj.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_ANON_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DEMO_ACCOUNTS = [
  { email: 'demo.learner@test.com', password: 'Demo@1221', role: 'learner' as const, displayName: 'Demo Learner' },
  { email: 'demo.tutor@test.com', password: 'Demo@1221', role: 'tutor' as const, displayName: 'Demo Tutor' },
  { email: 'demo.admin@test.com', password: 'Demo@1221', role: 'admin' as const, displayName: 'Demo Admin' },
];

async function setupDemoAccounts() {
  for (const account of DEMO_ACCOUNTS) {
    console.log(`\nCreating ${account.role} account: ${account.email}`);

    const { data, error } = await supabase.auth.signUp({
      email: account.email,
      password: account.password,
      options: {
        data: {
          display_name: account.displayName,
          role: account.role,
        },
        emailRedirectTo: `${SUPABASE_URL}/auth/callback`,
      },
    });

    if (error) {
      console.error(`  Error creating ${account.role}:`, error.message);
      continue;
    }

    console.log(`  Created user: ${data.user?.id}`);

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        role: account.role,
        display_name: account.displayName,
        xp: account.role === 'admin' ? 5000 : account.role === 'tutor' ? 1200 : 0,
        streak_count: account.role === 'admin' ? 30 : account.role === 'tutor' ? 15 : 5,
        onboarding_done: true,
        daily_goal_minutes: 15,
      });

      if (profileError) {
        console.error(`  Profile setup error:`, profileError.message);
      } else {
        console.log(`  Profile configured for ${account.role}`);
      }

      if (account.role === 'tutor') {
        const { error: tutorError } = await supabase.from('tutor_profiles').upsert({
          tutor_id: data.user.id,
          bio: 'Experienced tutor ready to help learners succeed.',
          subjects: ['Math', 'Science', 'Programming'],
          hourly_rate: 25,
          timezone: 'UTC',
          is_active: true,
          rating: 4,
          total_sessions: 0,
        });

        if (tutorError) {
          console.error(`  Tutor profile error:`, tutorError.message);
        } else {
          console.log(`  Tutor profile created`);
        }
      }
    }
  }

  console.log('\nDemo account setup complete.');
}

setupDemoAccounts().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
