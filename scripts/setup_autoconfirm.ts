import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function setup() {
  await sql.unsafe(`
    create or replace function public.auto_confirm_user()
    returns trigger as $$
    begin
      new.email_confirmed_at = coalesce(new.email_confirmed_at, now());
      return new;
    end;
    $$ language plpgsql security definer;

    drop trigger if exists on_auth_user_created_autoconfirm on auth.users;
    create trigger on_auth_user_created_autoconfirm
      before insert on auth.users
      for each row execute procedure public.auto_confirm_user();
  `);
  console.log("✅ Auto-confirm trigger installed on auth.users!");
  await sql.end();
  process.exit(0);
}

setup().catch((e) => {
  console.error("Trigger error:", e);
  process.exit(1);
});
