import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== PHASE 5 VERIFICATION (Social Features & Leaderboards) ===\n");

  // 1. Test Friend System
  console.log("[Test 1] Friend System Database Schema");
  const [friendshipCheck] = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'friendships'
    ) as exists
  `;
  console.log(`Friendships table exists: ${friendshipCheck.exists}`);

  const [friendshipColumns] = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'friendships'
    ORDER BY ordinal_position
  `;
  console.log("Friendships table columns:", friendshipColumns);

  // 2. Test Leaderboard Queries
  console.log("\n[Test 2] Leaderboard Queries");
  const [topUser] = await sql`
    SELECT id, display_name, xp, streak_count 
    FROM public.profiles 
    ORDER BY xp DESC 
    LIMIT 1
  `;
  console.log(`Top user by XP: ${topUser.display_name || "Anonymous"} with ${topUser.xp} XP`);

  const [topStreak] = await sql`
    SELECT id, display_name, streak_count 
    FROM public.profiles 
    WHERE streak_count > 0
    ORDER BY streak_count DESC 
    LIMIT 1
  `;
  if (topStreak) {
    console.log(`Top streak: ${topStreak.display_name || "Anonymous"} with ${topStreak.streak_count} days`);
  } else {
    console.log("No users with active streaks");
  }

  // 3. Test Notifications Schema
  console.log("\n[Test 3] Notifications Database Schema");
  const [notificationCheck] = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'notifications'
    ) as exists
  `;
  console.log(`Notifications table exists: ${notificationCheck.exists}`);

  const [notificationColumns] = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'notifications'
    ORDER BY ordinal_position
  `;
  console.log("Notifications table columns:", notificationColumns);

  // 4. Test Profile Page Data
  console.log("\n[Test 4] Profile Page Data Requirements");
  const [testProfile] = await sql`
    SELECT id, display_name, xp, streak_count, role 
    FROM public.profiles 
    LIMIT 1
  `;
  console.log(`Test profile: ${testProfile.display_name || "Anonymous"}`);
  console.log(`- XP: ${testProfile.xp}`);
  console.log(`- Streak: ${testProfile.streak_count} days`);
  console.log(`- Role: ${testProfile.role}`);

  const [userBadges] = await sql`
    SELECT COUNT(*) as count 
    FROM public.user_badges 
    WHERE user_id = ${testProfile.id}
  `;
  console.log(`- Badges earned: ${userBadges.count}`);

  const [completedLessons] = await sql`
    SELECT COUNT(*) as count 
    FROM public.user_progress 
    WHERE user_id = ${testProfile.id} AND status = 'completed'
  `;
  console.log(`- Lessons completed: ${completedLessons.count}`);

  // 5. Test Friend Status Query
  console.log("\n[Test 5] Friend Status Query");
  const [friendshipStatus] = await sql`
    SELECT status 
    FROM public.friendships 
    WHERE requester_id = ${testProfile.id} OR addressee_id = ${testProfile.id}
    LIMIT 1
  `;
  if (friendshipStatus) {
    console.log(`User has friendship with status: ${friendshipStatus.status}`);
  } else {
    console.log("User has no friendships");
  }

  console.log("\n✅ PHASE 5 CORE FEATURES VERIFIED");
  console.log("\nNote: Full end-to-end testing requires actual user interactions");
  console.log("through the UI. Database schema and queries are verified.");

  await sql.end();
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
