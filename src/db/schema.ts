import { relations, sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Better Auth-tabeller (navn og kolonner følger Better Auth sitt kjerneskjema)
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(), // visningsnavn
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // Better Auth sin admin-utvidelse: rolle og sperre
  role: text("role").notNull().default("user"),
  banned: boolean("banned").notNull().default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    impersonatedBy: text("impersonated_by"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Dart
// ---------------------------------------------------------------------------

export const group = pgTable("group", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groupMember = pgTable(
  "group_member",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => group.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["admin", "member"] }).notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] }), index("group_member_user_idx").on(t.userId)],
);

// Invitasjonslenke: /bli-med/<kode>. Kan brukes av flere, til den trekkes tilbake.
export const groupInvite = pgTable(
  "group_invite",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => group.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("group_invite_group_idx").on(t.groupId)],
);

export const match = pgTable(
  "match",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Kort, lesbart kampnummer (#42). Deles ut av en identitetskolonne.
    number: integer("number").notNull().unique().generatedByDefaultAsIdentity(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => group.id, { onDelete: "restrict" }),
    // Kampkode (f.eks. K7Q2X) som lar en TV vise kampen på /tv uten innlogging
    code: text("code").notNull().unique(),
    gameType: text("game_type").notNull(),
    status: text("status", { enum: ["active", "finished"] }).notNull().default("active"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    shareToken: text("share_token").unique(),
    winnerTeamId: uuid("winner_team_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("match_owner_idx").on(t.ownerId), index("match_group_idx").on(t.groupId)],
);

export const team = pgTable(
  "team",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => match.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: smallint("position").notNull(),
  },
  (t) => [unique("team_match_position_uq").on(t.matchId, t.position)],
);

export const player = pgTable(
  "player",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => match.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    guestName: text("guest_name"),
    // Navnet slik det var da kampen startet, så historikken overlever sletting av bruker
    nameSnapshot: text("name_snapshot").notNull(),
    position: smallint("position").notNull(),
  },
  (t) => [
    index("player_match_idx").on(t.matchId),
    index("player_user_idx").on(t.userId),
    // Ingen sjekk på user_id/guest_name: user_id settes til null når en bruker slettes,
    // og name_snapshot holder da på navnet.
  ],
);

export const dartThrow = pgTable(
  "throw",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => match.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => player.id, { onDelete: "cascade" }),
    // Løpenummer i kampen (0, 1, 2 ...). Unik per kamp, og hindrer doble innsendinger.
    seq: integer("seq").notNull(),
    round: integer("round").notNull(),
    dartIndex: smallint("dart_index").notNull(),
    // Faktisk tall pila traff: 1–20, 25 for bull, 0 for bom. Eldre kast har 102/103 for dobbel-/trippelringen uten tall.
    field: smallint("field").notNull(),
    // 1 = single, 2 = double (Bullseye på bull), 3 = triple (bom lagres som 1)
    multiplier: smallint("multiplier").notNull(),
    // Dobbel/trippel på 15–20 som telte på Dobbel-/Trippel-feltet i stedet for tallet
    ring: boolean("ring").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("throw_match_seq_uq").on(t.matchId, t.seq),
    check("throw_dart_index", sql`${t.dartIndex} between 0 and 2`),
    check("throw_multiplier", sql`${t.multiplier} between 1 and 3`),
    check("throw_field", sql`${t.field} between 0 and 20 or ${t.field} in (25, 102, 103)`),
  ],
);

export const matchRelations = relations(match, ({ many, one }) => ({
  teams: many(team),
  players: many(player),
  throws: many(dartThrow),
  owner: one(user, { fields: [match.ownerId], references: [user.id] }),
  group: one(group, { fields: [match.groupId], references: [group.id] }),
}));

export const teamRelations = relations(team, ({ one, many }) => ({
  match: one(match, { fields: [team.matchId], references: [match.id] }),
  players: many(player),
}));

export const playerRelations = relations(player, ({ one }) => ({
  match: one(match, { fields: [player.matchId], references: [match.id] }),
  team: one(team, { fields: [player.teamId], references: [team.id] }),
  user: one(user, { fields: [player.userId], references: [user.id] }),
}));

export const throwRelations = relations(dartThrow, ({ one }) => ({
  match: one(match, { fields: [dartThrow.matchId], references: [match.id] }),
  player: one(player, { fields: [dartThrow.playerId], references: [player.id] }),
}));
