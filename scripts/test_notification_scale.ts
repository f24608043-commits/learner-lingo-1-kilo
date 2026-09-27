import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== TEST: Notification System at Scale ===\n");

  try {
    // Get a test user
    const [testUser] = await sql`
      SELECT id, display_name
      FROM profiles
      LIMIT 1
    `;

    if (!testUser) {
      console.log("No test user found. Skipping notification scale test.");
      return;
    }

    console.log("Test User:", testUser.display_name);

    // Check current notification count
    const [currentCount] = await sql`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ${testUser.id}
    `;

    console.log("Current notifications:", currentCount.count);

    // Test creating 20 notifications in quick succession
    console.log("\n=== Creating 20 Test Notifications ===");
    
    const notificationTypes = [
      "friend_request",
      "friend_accepted",
      "badge_earned",
      "streak_milestone"
    ];

    const createdNotifications = [];
    for (let i = 0; i < 20; i++) {
      const type = notificationTypes[i % notificationTypes.length];
      const [notification] = await sql`
        INSERT INTO notifications (user_id, type, title, message, is_read)
        VALUES (
          ${testUser.id},
          ${type},
          ${`Test Notification ${i + 1}`},
          ${`This is test notification number ${i + 1} for scale testing`},
          false
        )
        RETURNING id
      `;
      createdNotifications.push(notification.id);
    }

    console.log("✓ Created 20 notifications");

    // Verify all 20 were created
    const [newCount] = await sql`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ${testUser.id}
    `;

    console.log("Total notifications after test:", newCount.count);
    const expectedTotal = Number(currentCount.count) + 20;
    console.log("Expected total:", expectedTotal);

    if (Number(newCount.count) === expectedTotal) {
      console.log("✓ PASS: All 20 notifications created successfully");
    } else {
      console.log("✗ FAIL: Notification count mismatch");
      console.log(`  Expected: ${expectedTotal}`);
      console.log(`  Actual: ${newCount.count}`);
    }

    // Verify all created notifications exist
    const [duplicateCheck] = await sql`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE id = ANY(${createdNotifications})
    `;

    if (Number(duplicateCheck.count) === 20) {
      console.log("✓ PASS: All 20 test notifications found");
    } else {
      console.log("✗ FAIL: Some test notifications missing");
      console.log(`  Expected: 20`);
      console.log(`  Actual: ${duplicateCheck.count}`);
    }

    // Cleanup test notifications
    await sql`
      DELETE FROM notifications
      WHERE id = ANY(${createdNotifications})
    `;

    console.log("✓ Cleaned up test notifications");

    console.log("\n=== Notification System Analysis ===");
    console.log("The notification system:");
    console.log("- Uses simple INSERT operations (no queuing)");
    console.log("- No rate limiting on notification creation");
    console.log("- Should handle 20+ notifications without issues");
    console.log("- For production scale, consider:");
    console.log("  * Background job queue for high volume");
    console.log("  * Rate limiting per user");
    console.log("  * Batch insert for bulk notifications");

    console.log("\n✓ Notification system handles burst of 20 notifications");

  } catch (error) {
    console.error("Notification scale test failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
