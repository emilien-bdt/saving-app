-- CreateEnum
CREATE TYPE "RepasSlot" AS ENUM ('LUNCH', 'DINNER');

-- CreateEnum
CREATE TYPE "RepasMealKind" AS ENUM ('DISH', 'LEFTOVER', 'OUT');

-- CreateEnum
CREATE TYPE "RepasMealStatus" AS ENUM ('PROPOSED', 'VALIDATED');

-- CreateTable
CREATE TABLE "repas_dish" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repas_dish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repas_meal" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "slot" "RepasSlot" NOT NULL,
    "kind" "RepasMealKind" NOT NULL,
    "dishId" TEXT,
    "label" TEXT,
    "note" TEXT,
    "status" "RepasMealStatus" NOT NULL DEFAULT 'PROPOSED',
    "importRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repas_meal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "repas_dish_key_key" ON "repas_dish"("key");

-- CreateIndex
CREATE UNIQUE INDEX "repas_meal_importRef_key" ON "repas_meal"("importRef");

-- CreateIndex
CREATE INDEX "repas_meal_dishId_idx" ON "repas_meal"("dishId");

-- CreateIndex
CREATE UNIQUE INDEX "repas_meal_date_slot_key" ON "repas_meal"("date", "slot");

-- AddForeignKey
ALTER TABLE "repas_meal" ADD CONSTRAINT "repas_meal_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "repas_dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Business rules Prisma cannot express (hand-written CHECK constraints).
ALTER TABLE "repas_dish" ADD CONSTRAINT "repas_dish_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 120);
ALTER TABLE "repas_dish" ADD CONSTRAINT "repas_dish_key_check" CHECK (char_length("key") BETWEEN 1 AND 120);
ALTER TABLE "repas_meal" ADD CONSTRAINT "repas_meal_kind_check" CHECK (
    ("kind" IN ('DISH', 'LEFTOVER') AND "dishId" IS NOT NULL)
    OR ("kind" = 'OUT' AND "dishId" IS NULL AND "label" IS NOT NULL)
);
ALTER TABLE "repas_meal" ADD CONSTRAINT "repas_meal_label_check" CHECK ("label" IS NULL OR char_length(btrim("label")) BETWEEN 1 AND 120);
ALTER TABLE "repas_meal" ADD CONSTRAINT "repas_meal_note_check" CHECK ("note" IS NULL OR char_length("note") <= 500);
