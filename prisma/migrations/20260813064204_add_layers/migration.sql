-- CreateTable
CREATE TABLE "layers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "layers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "layers_name_key" ON "layers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "layers_depth_key" ON "layers"("depth");

-- AlterTable
ALTER TABLE "clauses" ADD COLUMN     "layerId" TEXT;

-- Backfill: seed a default innermost layer and assign existing clauses to it.
INSERT INTO "layers" ("id", "name", "depth")
VALUES ('unsorted-layer', 'Unsorted', 0);

UPDATE "clauses" SET "layerId" = 'unsorted-layer' WHERE "layerId" IS NULL;

ALTER TABLE "clauses" ALTER COLUMN "layerId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "clauses_layerId_idx" ON "clauses"("layerId");

-- AddForeignKey
ALTER TABLE "clauses" ADD CONSTRAINT "clauses_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "layers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
