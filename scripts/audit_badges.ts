import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== AUDIT: General Badges in Database ===\n");

  try {
    // Check for required general badges
    const requiredBadges = [
      { criteriaType: "first_lesson", name: "First Step" },
      { criteriaType: "lessons_completed", name: "Level Up" },
      { criteriaType: "streak_days", name: "7 Day Streak" },
    ];

    console.log("Checking for required general badges:");
    
    for (const required of requiredBadges) {
      const [badge] = await sql`
        SELECT id, name, criteria_type, criteria_value, description, icon_url
        FROM badges
        WHERE criteria_type = ${required.criteriaType}
      `;
      
      if (badge) {
        console.log(`✓ ${required.name} (${required.criteriaType}): FOUND`);
        console.log(`  ID: ${badge.id}`);
        console.log(`  Description: ${badge.description || "N/A"}`);
        console.log(`  Criteria Value: ${badge.criteria_value || "N/A"}`);
      } else {
        console.log(`✗ ${required.name} (${required.criteriaType}): NOT FOUND`);
      }
    }

    // Show all badges in database
    console.log("\n=== All Badges in Database ===");
    const allBadges = await sql`
      SELECT id, name, criteria_type, criteria_value, description
      FROM badges
      ORDER BY name
    `;
    
    console.log(`Total badges: ${allBadges.length}`);
    allBadges.forEach((badge: any) => {
      console.log(`- ${badge.name} (${badge.criteria_type}): ${badge.description || "No description"}`);
    });

  } catch (error) {
    console.error("Audit failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
