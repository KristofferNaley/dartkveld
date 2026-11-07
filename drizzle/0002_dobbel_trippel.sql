ALTER TABLE "throw" DROP CONSTRAINT "throw_field";--> statement-breakpoint
ALTER TABLE "throw" ADD CONSTRAINT "throw_field" CHECK ("throw"."field" between 0 and 20 or "throw"."field" in (25, 102, 103));--> statement-breakpoint
-- Kamper spilt før Dobbel/Trippel og 20–15 beholder reglene de ble spilt med
UPDATE "match" SET "game_type" = 'mickey-mouse-10' WHERE "game_type" = 'mickey-mouse';
