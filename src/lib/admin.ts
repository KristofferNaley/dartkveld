import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { fillWeeks } from "./admin-shared";

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  createdAt: Date;
  lastActive: Date | null;
  matches: number;
  groups: number;
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const res = await db.execute<{
    id: string; name: string; email: string; role: string; banned: boolean;
    created_at: Date; last_active: Date | null; matches: number; groups: number;
  }>(sql`
    select u.id, u.name, u.email, u.role, u.banned, u.created_at,
      greatest(
        (select max(s.updated_at) from session s where s.user_id = u.id),
        (select max(t.created_at) from throw t join player p on p.id = t.player_id where p.user_id = u.id)
      ) as last_active,
      (select count(distinct m.id)::int from match m left join player p on p.match_id = m.id
         where m.owner_id = u.id or p.user_id = u.id) as matches,
      (select count(*)::int from group_member gm where gm.user_id = u.id) as groups
    from "user" u
    order by u.created_at desc
  `);
  return res.rows.map((r) => ({
    id: r.id, name: r.name, email: r.email, role: r.role, banned: r.banned,
    createdAt: new Date(r.created_at), lastActive: r.last_active ? new Date(r.last_active) : null,
    matches: r.matches, groups: r.groups,
  }));
}

/** Antall kamper som slettes sammen med brukeren (kamper brukeren har opprettet). */
export async function ownedMatchCount(userId: string): Promise<number> {
  const res = await db.execute<{ n: number }>(sql`select count(*)::int as n from match where owner_id = ${userId}`);
  return res.rows[0]?.n ?? 0;
}

const WEEKS = 12;

async function weekly(query: ReturnType<typeof sql>) {
  const res = await db.execute<{ week: string; n: number }>(query);
  return fillWeeks(res.rows, WEEKS, new Date());
}

export async function usageOverview() {
  const since = sql`date_trunc('week', now() at time zone 'Europe/Oslo') - interval '${sql.raw(String(WEEKS - 1))} weeks'`;
  const [totals, matchesPerWeek, throwsPerWeek, activePerWeek, signupsPerWeek] = await Promise.all([
    db.execute<{
      users: number; groups: number; matches: number; active_matches: number; throws: number; active30: number; banned: number;
    }>(sql`
      select
        (select count(*)::int from "user") as users,
        (select count(*)::int from "group") as groups,
        (select count(*)::int from match) as matches,
        (select count(*)::int from match where status = 'active') as active_matches,
        (select count(*)::int from throw) as throws,
        (select count(*)::int from "user" where banned) as banned,
        (select count(*)::int from (
           select user_id from session where updated_at > now() - interval '30 days'
           union
           select p.user_id from throw t join player p on p.id = t.player_id
             where t.created_at > now() - interval '30 days' and p.user_id is not null
         ) x) as active30
    `),
    weekly(sql`select to_char(date_trunc('week', created_at at time zone 'Europe/Oslo'), 'YYYY-MM-DD') as week, count(*)::int as n
      from match where created_at at time zone 'Europe/Oslo' >= ${since} group by 1`),
    weekly(sql`select to_char(date_trunc('week', created_at at time zone 'Europe/Oslo'), 'YYYY-MM-DD') as week, count(*)::int as n
      from throw where created_at at time zone 'Europe/Oslo' >= ${since} group by 1`),
    weekly(sql`select to_char(date_trunc('week', x.at at time zone 'Europe/Oslo'), 'YYYY-MM-DD') as week, count(distinct x.user_id)::int as n
      from (
        select user_id, updated_at as at from session
        union all
        select p.user_id, t.created_at from throw t join player p on p.id = t.player_id where p.user_id is not null
      ) x where x.at at time zone 'Europe/Oslo' >= ${since} group by 1`),
    weekly(sql`select to_char(date_trunc('week', created_at at time zone 'Europe/Oslo'), 'YYYY-MM-DD') as week, count(*)::int as n
      from "user" where created_at at time zone 'Europe/Oslo' >= ${since} group by 1`),
  ]);
  const t = totals.rows[0];
  return {
    users: t.users, groups: t.groups, matches: t.matches, activeMatches: t.active_matches, throws: t.throws, banned: t.banned, active30: t.active30,
    series: [
      { key: "matches", title: "Kamper per uke", data: matchesPerWeek },
      { key: "throws", title: "Kast per uke", data: throwsPerWeek },
      { key: "active", title: "Aktive brukere per uke", data: activePerWeek },
      { key: "signups", title: "Nye brukere per uke", data: signupsPerWeek },
    ],
  };
}
