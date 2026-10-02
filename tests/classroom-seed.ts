import path from 'path';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { db, withDbRetry } from '../db';
import { eq } from 'drizzle-orm';
import { groups, groupMembers, tutorReviews, profiles } from '../db/schema';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

export const TEST_GROUP_NAME = '_pw_classroom_group';
export const TEST_CODE = 'PWTEST';
export const REVIEW_MARKER = 'Seeded by the classroom Playwright suite.';

export const TUTOR_EMAIL = 'tutor@gmail.com';
export const LEARNER_EMAIL = 'learner@gmail.com';

/** `profiles.id` is the auth user id, so email lives in auth.users. */
export async function findUserIdByEmail(email: string): Promise<string> {
  const client = postgres(process.env.DATABASE_URL!, {
    prepare: false,
    ssl: { rejectUnauthorized: false },
    onnotice: () => {},
    connect_timeout: 30,
    max: 1,
  });

  try {
    // The pooler occasionally times out; retry like the migration scripts do.
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      try {
        const rows = await client`SELECT id FROM auth.users WHERE email = ${email} LIMIT 1`;
        if (rows[0]?.id) return rows[0].id as string;
        break;
      } catch (err) {
        if (attempt === 5) throw err;
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    throw new Error(`No auth user for ${email}`);
  } finally {
    await client.end();
  }
}

/**
 * Creates one tutor-owned group with a known join code. Returns the ids the
 * tests need. Anything created here is removed by `cleanupClassroomData`.
 */
export async function seedClassroom() {
  await cleanupClassroomData();

  const tutorId = await findUserIdByEmail(TUTOR_EMAIL);

  const [group] = await db
    .insert(groups)
    .values({
      tutorId,
      name: TEST_GROUP_NAME,
      description: 'Seeded by the classroom Playwright suite.',
      subject: 'Mathematics',
      gradeLevel: 'Year 8',
      groupCode: TEST_CODE,
      privacy: 'private',
    })
    .returning();

  return { groupId: group.id, tutorId, code: group.groupCode ?? TEST_CODE };
}

export async function addMember(groupId: string, email: string) {
  const learnerId = await findUserIdByEmail(email);

  await db
    .insert(groupMembers)
    .values({ groupId, learnerId, role: 'student' })
    .onConflictDoNothing();

  return learnerId;
}

/** Removes every row the classroom suite can create, including cascades. */
export async function cleanupClassroomData() {
  // Reads are safe to retry when the pooler drops a connection.
  const groupIds = (
    await withDbRetry(() =>
      db.select({ id: groups.id }).from(groups).where(eq(groups.name, TEST_GROUP_NAME))
    )
  ).map((g) => g.id);

  for (const id of groupIds) {
    // Deleting the group cascades to members, assignments, submissions,
    // announcements, comments and enrollment requests. Re-running a delete is
    // harmless, so it is retryable too.
    await withDbRetry(() => db.delete(groups).where(eq(groups.id, id)));
  }

  // Reviews hang off profiles, so they need clearing by marker.
  await withDbRetry(() =>
    db.delete(tutorReviews).where(eq(tutorReviews.reviewText, REVIEW_MARKER))
  );

  return { groups: groupIds.length };
}

export { db, profiles };