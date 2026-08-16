-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- AlterTable
ALTER TABLE "clauses" ADD COLUMN     "categoryId" TEXT;

-- Backfill: give existing clauses a default category so the column can be
-- made required below without losing data.
INSERT INTO "categories" ("id", "name") VALUES ('uncategorized', 'Uncategorized');
UPDATE "clauses" SET "categoryId" = 'uncategorized' WHERE "categoryId" IS NULL;

ALTER TABLE "clauses" ALTER COLUMN "categoryId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "clauses_categoryId_idx" ON "clauses"("categoryId");

-- AddForeignKey
ALTER TABLE "clauses" ADD CONSTRAINT "clauses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
