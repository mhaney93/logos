/*
  Warnings:

  - Added the required column `form` to the `arguments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ArgumentForm" AS ENUM ('MODUS_PONENS', 'MODUS_TOLLENS', 'HYPOTHETICAL_SYLLOGISM', 'DISJUNCTIVE_SYLLOGISM', 'CATEGORICAL_SYLLOGISM', 'SIMPLE_INFERENCE', 'CUMULATIVE_CASE');

-- AlterTable: backfill existing rows as CUMULATIVE_CASE (no constraint on premise count), then drop the default
ALTER TABLE "arguments" ADD COLUMN "form" "ArgumentForm" NOT NULL DEFAULT 'CUMULATIVE_CASE';
ALTER TABLE "arguments" ALTER COLUMN "form" DROP DEFAULT;
