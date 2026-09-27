import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Test Friend Request Rate Limits ===\n");

  try {
    // Get all users
    const users = await sql`
      SELECT p.id, a.email, p.display_name, p.role
      FROM profiles p
      JOIN auth.users a ON p.id = a.id
      ORDER BY p.role, p.display_name
    `;

    console.log(`Found ${users.length} users\n`);

    if (users.length < 12) {
      console.log("⚠ Need at least 12 users to test 10-pending cap");
      console.log("Current users:", users.length);
      return;
    }

    // Use first user as sender, rest as recipients
    const sender = users[0];
    const recipients = users.slice(1, 12);

    console.log(`Sender: ${sender.email} (${sender.role})`);
    console.log(`Recipients: ${recipients.length} users\n`);

    // Clean up existing friend requests from sender
    await sql`
      DELETE FROM friendships
      WHERE requester_id = ${sender.id}
    `;
    console.log("✓ Cleaned up existing friend requests from sender\n");

    // Test 10-pending cap (spread over time to avoid 5-per-hour cap)
    console.log("=== TEST 1: 10-Pending Cap ===");
    let successCount = 0;
    let firstError = null;

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      try {
        // Spread requests over 2+ hours to avoid 5-per-hour cap
        const requestTime = new Date(Date.now() - (i * 2 * 3600000)); // 2 hours apart
        await sql`
          INSERT INTO friendships (requester_id, addressee_id, status, created_at)
          VALUES (${sender.id}, ${recipient.id}, 'pending', ${requestTime})
          ON CONFLICT (requester_id, addressee_id) DO NOTHING
        `;
        successCount++;
        console.log(`✓ Request ${i + 1}: ${recipient.email} - SUCCESS`);
      } catch (error: any) {
        if (!firstError) {
          firstError = error;
        }
        console.log(`✗ Request ${i + 1}: ${recipient.email} - FAILED`);
        console.log(`  Error: ${error.message}`);
      }
    }

    console.log(`\nResult: ${successCount}/${recipients.length} requests succeeded`);
    console.log(`Expected: First 10 succeed, 11th fails`);
    console.log(`Status: ${successCount === 10 ? '✓ PASS' : '✗ FAIL'}\n`);

    // Clean up for next test
    await sql`
      DELETE FROM friendships
      WHERE requester_id = ${sender.id}
    `;
    console.log("✓ Cleaned up for next test\n");

    // Test 5-per-hour cap
    console.log("=== TEST 2: 5-Per-Hour Cap ===");
    const fiveMinutesAgo = new Date(Date.now() - 300000); // 5 minutes ago

    // Insert 5 recent requests (within rate window)
    const recentRecipients = recipients.slice(0, 5);
    for (let i = 0; i < recentRecipients.length; i++) {
      await sql`
        INSERT INTO friendships (requester_id, addressee_id, status, created_at)
        VALUES (${sender.id}, ${recentRecipients[i].id}, 'pending', ${fiveMinutesAgo})
        ON CONFLICT (requester_id, addressee_id) DO NOTHING
      `;
    }
    console.log(`✓ Inserted 5 requests from 5 minutes ago (within rate window)\n`);

    // Try to send 6th request
    const newRecipient = recipients[5];
    let sixthRequestSuccess = false;
    let sixthRequestError = null;

    try {
      await sql`
        INSERT INTO friendships (requester_id, addressee_id, status)
        VALUES (${sender.id}, ${newRecipient.id}, 'pending')
      `;
      sixthRequestSuccess = true;
      console.log(`✓ 6th request: ${newRecipient.email} - SUCCESS (should fail)`);
    } catch (error: any) {
      sixthRequestError = error;
      console.log(`✗ 6th request: ${newRecipient.email} - FAILED (expected)`);
      console.log(`  Error: ${error.message}`);
    }

    console.log(`\nResult: ${sixthRequestSuccess ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Expected: 6th request should fail`);
    console.log(`Status: ${!sixthRequestSuccess ? '✓ PASS' : '✗ FAIL'}\n`);

    // Clean up
    await sql`
      DELETE FROM friendships
      WHERE requester_id = ${sender.id}
    `;
    console.log("✓ Cleaned up test data\n");

    console.log("=== Summary ===");
    console.log(`10-pending cap: ${successCount === 10 ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`5-per-hour cap: ${!sixthRequestSuccess ? '✓ PASS' : '✗ FAIL'}`);

  } catch (error) {
    console.error("Test failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
