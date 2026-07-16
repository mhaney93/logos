-- DropIndex
DROP INDEX "clauses_embedding_idx";

-- AlterTable
ALTER TABLE "clauses" ADD COLUMN     "support" TEXT;
