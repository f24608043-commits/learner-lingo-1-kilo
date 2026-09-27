import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createTestAccount(email: string, password: string, role: string, displayName: string) {
  console.log(`Creating test account: ${email} with role: ${role}`);
  
  // Create user with email confirmed
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName,
      role: role,
    },
  });
  
  if (error) {
    if (error.message.includes("already registered")) {
      console.log(`User ${email} already exists, updating role...`);
      // Update existing user's metadata
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existingUser = users.find(u => u.email === email);
      if (existingUser) {
        await supabase.auth.admin.updateUserById(existingUser.id, {
          user_metadata: { display_name: displayName, role: role },
        });
        console.log(`Updated user ${email} with role: ${role}`);
      }
      return;
    }
    console.error(`Error creating user ${email}:`, error);
    return;
  }
  
  console.log(`User created: ${data.user.id} with role: ${role}`);
}

async function main() {
  console.log("Creating test accounts...");
  
  await createTestAccount("test-learner@example.com", "testpassword123", "learner", "Test Learner");
  await createTestAccount("test-tutor@example.com", "testpassword123", "tutor", "Test Tutor");
  await createTestAccount("test-admin@example.com", "testpassword123", "admin", "Test Admin");
  
  console.log("Test accounts created successfully!");
}

main().catch(console.error);
