-- Shift every layer's depth up by 1 (most fundamental layer becomes depth 1
-- instead of depth 0). Bounce through the negative range first so no two
-- rows can collide on the unique "depth" index mid-statement, regardless of
-- row processing order.
UPDATE "layers" SET "depth" = -"depth" - 1;
UPDATE "layers" SET "depth" = -"depth";
