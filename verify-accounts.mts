import { db } from './db/index.js';
import { sql } from 'drizzle-orm';

const rows = (await db.execute(
  sql`select u.email, p.display_name, p.role, p.onboarding_done,
      (select count(*) from tutor_profiles tp where tp.tutor_id = p.id) as is_tutor
    from auth.users u
    join profiles p on p.id = u.id
    where u.email in ('bilal@gmail.com','usman@gmail.com','junaid@gmail.com')
    order by u.email`
)) as unknown as any[];
console.log(JSON.stringify(rows, null, 1));
process.exit(0);