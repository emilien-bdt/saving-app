-- AlterTable
ALTER TABLE "repas_ingredient" ADD COLUMN "side" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "repas_meal_side" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "repas_meal_side_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "repas_meal_side_ingredientId_idx" ON "repas_meal_side"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "repas_meal_side_mealId_ingredientId_key" ON "repas_meal_side"("mealId", "ingredientId");

-- AddForeignKey
ALTER TABLE "repas_meal_side" ADD CONSTRAINT "repas_meal_side_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "repas_meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repas_meal_side" ADD CONSTRAINT "repas_meal_side_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "repas_ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A DISH meal may now have no dish (sides only: "concombre + feta"); a leftover still needs its dish.
ALTER TABLE "repas_meal" DROP CONSTRAINT "repas_meal_kind_check";
ALTER TABLE "repas_meal" ADD CONSTRAINT "repas_meal_kind_check" CHECK (
    ("kind" = 'LEFTOVER' AND "dishId" IS NOT NULL)
    OR "kind" = 'DISH'
    OR ("kind" = 'OUT' AND "dishId" IS NULL AND "label" IS NOT NULL)
);

-- Initial side list (domain/sides.ts DEFAULT_SIDES; keys = ingredientKey).
INSERT INTO "repas_ingredient" ("id", "name", "key", "aisle", "unit", "side", "updatedAt") VALUES
    (gen_random_uuid()::text, 'Chips', 'chip', 'EPICERIE_SALEE', 'PIECE', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Salade', 'salade', 'FRUITS_LEGUMES', 'PIECE', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Mâche', 'mache', 'FRUITS_LEGUMES', 'PIECE', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Concombre', 'concombre', 'FRUITS_LEGUMES', 'PIECE', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Tomates', 'tomate', 'FRUITS_LEGUMES', 'PIECE', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Crudités', 'crudite', 'FRUITS_LEGUMES', 'PIECE', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Légumes', 'legume', 'FRUITS_LEGUMES', 'PIECE', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Feta', 'feta', 'CREMERIE', 'PIECE', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Mozza', 'mozza', 'CREMERIE', 'PIECE', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Pain', 'pain', 'BOULANGERIE', 'PIECE', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Fromage', 'fromage', 'CREMERIE', 'PIECE', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Pastèque', 'pasteque', 'FRUITS_LEGUMES', 'PIECE', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Melon', 'melon', 'FRUITS_LEGUMES', 'PIECE', true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET "side" = true;
