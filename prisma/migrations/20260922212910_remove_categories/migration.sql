-- Drop categories entirely: the Clause.categoryId column, its FK/index, and the categories table.
ALTER TABLE "clauses" DROP CONSTRAINT IF EXISTS "clauses_categoryId_fkey";
DROP INDEX IF EXISTS "clauses_categoryId_idx";
ALTER TABLE "clauses" DROP COLUMN IF EXISTS "categoryId";

ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_parentId_fkey";
DROP TABLE IF EXISTS "categories";
