CREATE TABLE "group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_invite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"code" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "group_invite_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "group_member" (
	"group_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_member_group_id_user_id_pk" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "match" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "match" ADD COLUMN "code" text;--> statement-breakpoint
-- Eksisterende brukere og kamper flyttes inn i en første gruppe, «Dartkveld». Den eldste brukeren blir admin.
DO $$
DECLARE
  gid uuid;
  first_user text;
BEGIN
  SELECT "id" INTO first_user FROM "user" ORDER BY "created_at", "id" LIMIT 1;
  IF first_user IS NOT NULL THEN
    INSERT INTO "group" ("name", "created_by") VALUES ('Dartkveld', first_user) RETURNING "id" INTO gid;
    INSERT INTO "group_member" ("group_id", "user_id", "role", "joined_at")
      SELECT gid, "id", CASE WHEN "id" = first_user THEN 'admin' ELSE 'member' END, "created_at" FROM "user";
    INSERT INTO "group_invite" ("group_id", "code", "created_by")
      VALUES (gid, substr(md5(random()::text || clock_timestamp()::text), 1, 16), first_user);
    UPDATE "match" SET "group_id" = gid;
  END IF;
END $$;--> statement-breakpoint
-- Kampkode: 5 tegn uten tegn som kan forveksles (ingen 0/O, 1/I)
DO $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  r record;
  c text;
BEGIN
  FOR r IN SELECT "id" FROM "match" LOOP
    LOOP
      c := '';
      FOR i IN 1..5 LOOP
        c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "match" WHERE "code" = c);
    END LOOP;
    UPDATE "match" SET "code" = c WHERE "id" = r."id";
  END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "match" ALTER COLUMN "group_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "match" ALTER COLUMN "code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "group" ADD CONSTRAINT "group_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invite" ADD CONSTRAINT "group_invite_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invite" ADD CONSTRAINT "group_invite_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_invite_group_idx" ON "group_invite" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_member_user_idx" ON "group_member" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_group_idx" ON "match" USING btree ("group_id");--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_code_unique" UNIQUE("code");