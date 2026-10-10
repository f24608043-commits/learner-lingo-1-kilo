import path from 'path';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { db } from './db/index.js';
import { profiles, tutorProfiles } from './db/schema.js';
import { eq } from 'drizzle-orm';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const ACCOUNTS = [
  { name: 'Bilal', email: 'bilal@gmail.com', role: 'tutor' as const, bio: 'Maths and physics tutor.' },
  { name: 'Usman', email: 'usman@gmail.com', role: 'admin' as const, bio: 'Platform administrator.' },
  { name: 'Junaid', email: 'junaid@gmail.com', role: 'learner' as const, bio: 'Curious learner.' },
];
const PASSWORD = 'BilalUsmanJunaid@1221';

async function signUp(email: string, displayName: string) {
  const res = await fetch(`${URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, data: { display_name: displayName } }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`signUp failed for ${email}: ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  for (const a of ACCOUNTS) {
    let result: any;
    try {
      result = await signUp(a.email, a.name);
    } catch (e) {
      console.log(`signUp ${a.email}: ${String(e).slice(0, 120)}`);
    }

    const client = postgres(process.env.DATABASE_URL!, {
      prepare: false,
      ssl: { rejectUnauthorized: false },
      onnotice: () => {},
      connect_timeout: 30,
      max: 1,
    });
    let userId: string | undefined = result?.user?.id;
    if (!userId) {
      const rows = await client`SELECT id FROM auth.users WHERE email = ${a.email} LIMIT 1`;
      userId = rows[0]?.id;
    }
    await client.end();

    if (!userId) throw new Error(`could not resolve user id for ${a.email}`);

    await db
      .insert(profiles)
      .values({ id: userId, displayName: a.name, role: a.role, xp: 0, streakCount: 0, onboardingDone: true })
      .onConflictDoUpdate({ target: profiles.id, set: { role: a.role, displayName: a.name, onboardingDone: true } });

    if (a.role === 'tutor') {
      await db
        .insert(tutorProfiles)
        .values({ tutorId: userId, bio: a.bio, subjects: ['Mathematics', 'Physics'], hourlyRate: 25, timezone: 'UTC', isActive: true })
        .onConflictDoUpdate({ target: tutorProfiles.tutorId, set: { bio: a.bio, isActive: true } });
    }

    console.log(`OK ${a.name} <${a.email}> id=${userId} role=${a.role}`);
  }
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });