import { db } from './db/index.js';
import { sql } from 'drizzle-orm';

const total = (await db.execute(sql`select count(*)::int as c from profiles`)) as unknown as any[];
console.log('TOTAL PROFILES:', JSON.stringify(total));

const rows = (await db.execute(
  sql`select p.display_name, p.role, u.email
    from profiles p join auth.users u on u.id = p.id
    order by p.display_name nulls last
    limit 60`
)) as unknown as any[];
console.log('FIRST 60:', JSON.stringify(rows));

const found = rows.filter((r) => ['Bilal', 'Usman', 'Junaid'].includes(r.display_name));
console.log('NEW ACCOUNTS IN LIST:', JSON.stringify(found));
process.exit(0);