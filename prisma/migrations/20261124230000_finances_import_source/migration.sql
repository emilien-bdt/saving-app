-- Import of Revolut CSV statements (Finances › Importer): origin of each import batch.
-- CreateEnum
CREATE TYPE "ImportSource" AS ENUM ('EXCEL', 'REVOLUT');

-- AlterTable
ALTER TABLE "finances_import_batch" ADD COLUMN "source" "ImportSource" NOT NULL DEFAULT 'EXCEL';
