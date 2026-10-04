import path from 'path';
import dotenv from 'dotenv';
import { db, withDbRetry } from '../db';
import { and, eq, or, inArray, sql } from 'drizzle-orm';
import { conversations, conversationMembers, messages, friendships } from '../db/schema';
import { findUserIdByEmail } from './classroom-seed';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

export const LEARNER_EMAIL = 'learner@gmail.com';
export const TUTOR_EMAIL = 'tutor@gmail.com';
export const TUTOR2_EMAIL = 'tutor2@gmail.com';

/** Marker title so the seeded group thread can be found and removed. */
export const TEST_GROUP_TITLE = '_pw_group_chat';

export function directKey(a: string, b: string): string {
  return [a, b].sort().join('-');
}

/**
 * Setup runs before any test and is not user-facing, so it can afford far more
 * attempts than an interactive request. A transient pooler drop in here aborts
 * the whole spec from beforeAll, which costs every test in the file.
 */
const SEED_ATTEMPTS = 10;

function seedRetry<T>(operation: () => Promise<T>): Promise<T> {
  return withDbRetry(operation, SEED_ATTEMPTS);
}

let pairKeys: string[] = [];

/**
 * Puts messaging into a known state:
 *  - learner and tutor are accepted friends, so the friends grid shows a card
 *    with a chat button. Learner -> tutor is always permitted, so the chat
 *    action succeeds without a session request.
 *  - learner and tutor2 have no friendship row, so "+ Add" is still offered
 *    for them and the request/accept flow can be exercised.
 *  - conversations this suite created for those pairs are removed, so every run
 *    starts from an empty thread.
 */
export async function seedMessaging() {
  const learnerId = await findUserIdByEmail(LEARNER_EMAIL);
  const tutorId = await findUserIdByEmail(TUTOR_EMAIL);
  const tutor2Id = await findUserIdByEmail(TUTOR2_EMAIL);

  pairKeys = [directKey(learnerId, tutorId), directKey(learnerId, tutor2Id)];

  await deleteSuiteConversations();
  await deletePairFriendships(learnerId, tutorId, tutor2Id);

  await seedRetry(() =>
    db
      .insert(friendships)
      .values({ requesterId: learnerId, addresseeId: tutorId, status: 'accepted' })
      .onConflictDoNothing()
  );

  return { learnerId, tutorId, tutor2Id };
}

export async function cleanupMessaging() {
  const learnerId = await findUserIdByEmail(LEARNER_EMAIL);
  const tutorId = await findUserIdByEmail(TUTOR_EMAIL);
  const tutor2Id = await findUserIdByEmail(TUTOR2_EMAIL);

  pairKeys = [directKey(learnerId, tutorId), directKey(learnerId, tutor2Id)];

  await deleteSuiteConversations();
  await deletePairFriendships(learnerId, tutorId, tutor2Id);
}

async function deleteSuiteConversations() {
  if (!pairKeys.length) return;

  const doomed = (
    await seedRetry(() =>
      db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          or(
            inArray(conversations.directKey, pairKeys),
            eq(conversations.title, TEST_GROUP_TITLE)
          )
        )
    )
  ).map((c) => c.id);

  for (const id of doomed) {
    // Messages and memberships cascade from the conversation, and deleting an
    // already-removed conversation is a no-op, so this is safe to retry.
    await seedRetry(() => db.delete(conversations).where(eq(conversations.id, id)));
  }
}

async function deletePairFriendships(learnerId: string, tutorId: string, tutor2Id: string) {
  const pairs: Array<[string, string]> = [
    [learnerId, tutorId],
    [learnerId, tutor2Id],
  ];

  for (const [a, b] of pairs) {
    await seedRetry(() =>
      db
        .delete(friendships)
        .where(
          or(
            and(eq(friendships.requesterId, a), eq(friendships.addresseeId, b)),
            and(eq(friendships.requesterId, b), eq(friendships.addresseeId, a))
          )
        )
    );
  }
}

export async function getConversationIdByKey(a: string, b: string): Promise<string | null> {
  const [row] = await seedRetry(() =>
    db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.directKey, directKey(a, b)))
      .limit(1)
  );
  return row?.id ?? null;
}

/** Creates the direct conversation if it does not exist, as the app would. */
export async function ensureDirectConversation(a: string, b: string): Promise<string> {
  const key = directKey(a, b);
  const existing = await getConversationIdByKey(a, b);
  if (existing) return existing;

  const [conversation] = await db
    .insert(conversations)
    .values({ type: 'direct', createdBy: a, directKey: key })
    .returning();

  // conversation_members is unique on (conversation_id, user_id), so this is
  // safe even if a retry repeats a membership that already landed.
  await seedRetry(() =>
    db
      .insert(conversationMembers)
      .values([
        { conversationId: conversation.id, userId: a, role: 'member' },
        { conversationId: conversation.id, userId: b, role: 'member' },
      ])
      .onConflictDoNothing()
  );

  return conversation.id;
}

/** Creates the group thread if it does not exist, matching createGroup. */
export async function ensureGroupConversation(members: string[]): Promise<string> {
  const [existing] = await seedRetry(() =>
    db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.title, TEST_GROUP_TITLE))
      .limit(1)
  );
  if (existing) return existing.id;

  const [conversation] = await db
    .insert(conversations)
    .values({
      type: 'group',
      title: TEST_GROUP_TITLE,
      createdBy: members[0],
      jitsiRoomId: `lego-class-pw-${Date.now()}`,
    })
    .returning();

  await seedRetry(() =>
    db
      .insert(conversationMembers)
      .values(
        members.map((userId, idx) => ({
          conversationId: conversation.id,
          userId,
          role: idx === 0 ? 'admin' : 'member',
        }))
      )
      .onConflictDoNothing()
  );

  return conversation.id;
}

/** True when the messages table is published for Realtime. */
export async function isMessagesRealtimeEnabled(): Promise<boolean> {
  const rows = (await withDbRetry(() =>
    db.execute(
      sql`select 1 from pg_publication_tables
          where pubname = 'supabase_realtime' and tablename = 'messages'`
    )
  )) as unknown as unknown[];

  return rows.length > 0;
}

export async function countMessages(conversationId: string): Promise<number> {
  const rows = await withDbRetry(() =>
    db
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
  );
  return rows.length;
}

export async function getMemberIds(conversationId: string): Promise<string[]> {
  const rows = await withDbRetry(() =>
    db
      .select({ userId: conversationMembers.userId })
      .from(conversationMembers)
      .where(eq(conversationMembers.conversationId, conversationId))
  );
  return rows.map((r) => r.userId);
}
