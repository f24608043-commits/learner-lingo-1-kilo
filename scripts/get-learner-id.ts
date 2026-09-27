import { createClient } from '@supabase/supabase-js';

async function getLearnerId() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const email = 'testlearner+test@gmail.com';
  
  // List users (requires service role key, but we'll try with anon for now)
  // Since we can't use admin.listUsers with anon key, we'll need a different approach
  console.log('To get learner ID, please run this query in Supabase SQL editor:');
  console.log(`SELECT id FROM auth.users WHERE email = '${email}';`);
}

getLearnerId().catch(console.error);
