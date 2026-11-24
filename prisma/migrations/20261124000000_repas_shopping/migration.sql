-- CreateEnum
CREATE TYPE "RepasShoppingSource" AS ENUM ('MEALS', 'STAPLE', 'MANUAL');

-- AlterTable
ALTER TABLE "repas_ingredient" ADD COLUMN "staple" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "repas_shopping_item" (
    "id" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "source" "RepasShoppingSource" NOT NULL,
    "amount" INTEGER,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "removed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repas_shopping_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "repas_shopping_item_ingredientId_idx" ON "repas_shopping_item"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "repas_shopping_item_weekStart_ingredientId_key" ON "repas_shopping_item"("weekStart", "ingredientId");

-- AddForeignKey
ALTER TABLE "repas_shopping_item" ADD CONSTRAINT "repas_shopping_item_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "repas_ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Business rules (hand-written CHECK constraints).
ALTER TABLE "repas_shopping_item" ADD CONSTRAINT "repas_shopping_item_amount_check" CHECK ("amount" IS NULL OR "amount" > 0);
ALTER TABLE "repas_shopping_item" ADD CONSTRAINT "repas_shopping_item_monday_check" CHECK (EXTRACT(ISODOW FROM "weekStart") = 1);
ALTER TABLE "repas_shopping_item" ADD CONSTRAINT "repas_shopping_item_removed_check" CHECK (NOT "removed" OR "source" = 'MEALS');

-- Initial staples (editable in Repas › Paramètres; keys = ingredientKey).
INSERT INTO "repas_ingredient" ("id", "name", "key", "aisle", "unit", "staple", "updatedAt") VALUES
    (gen_random_uuid()::text, 'Lait', 'lait', 'CREMERIE', 'ML', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Beurre', 'beurre', 'CREMERIE', 'PIECE', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Œufs', 'oeuf', 'CREMERIE', 'PIECE', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Pain de mie', 'pain de mie', 'BOULANGERIE', 'PIECE', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Farine', 'farine', 'EPICERIE_SALEE', 'PIECE', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Huile d''olive', 'huile d''olive', 'EPICERIE_SALEE', 'PIECE', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Sucre', 'sucre', 'EPICERIE_SUCREE', 'PIECE', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Café', 'cafe', 'EPICERIE_SUCREE', 'PIECE', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Papier toilette', 'papier toilette', 'HYGIENE_ENTRETIEN', 'PIECE', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Liquide vaisselle', 'liquide vaisselle', 'HYGIENE_ENTRETIEN', 'PIECE', true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET "staple" = true;
