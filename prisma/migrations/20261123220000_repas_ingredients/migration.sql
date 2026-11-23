-- CreateEnum
CREATE TYPE "RepasAisle" AS ENUM ('FRUITS_LEGUMES', 'BOUCHERIE_POISSON', 'CHARCUTERIE_TRAITEUR', 'CREMERIE', 'EPICERIE_SALEE', 'EPICERIE_SUCREE', 'SURGELES', 'BOULANGERIE', 'BOISSONS', 'HYGIENE_ENTRETIEN', 'AUTRE');

-- CreateEnum
CREATE TYPE "RepasUnit" AS ENUM ('PIECE', 'G', 'ML');

-- CreateTable
CREATE TABLE "repas_ingredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "aisle" "RepasAisle" NOT NULL DEFAULT 'AUTRE',
    "unit" "RepasUnit" NOT NULL DEFAULT 'PIECE',
    "packAmount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repas_ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repas_dish_ingredient" (
    "id" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "amount" INTEGER,
    "suggested" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "repas_dish_ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "repas_ingredient_key_key" ON "repas_ingredient"("key");

-- CreateIndex
CREATE INDEX "repas_dish_ingredient_ingredientId_idx" ON "repas_dish_ingredient"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "repas_dish_ingredient_dishId_ingredientId_key" ON "repas_dish_ingredient"("dishId", "ingredientId");

-- AddForeignKey
ALTER TABLE "repas_dish_ingredient" ADD CONSTRAINT "repas_dish_ingredient_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "repas_dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repas_dish_ingredient" ADD CONSTRAINT "repas_dish_ingredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "repas_ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Business rules Prisma cannot express (hand-written CHECK constraints).
ALTER TABLE "repas_ingredient" ADD CONSTRAINT "repas_ingredient_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 80);
ALTER TABLE "repas_ingredient" ADD CONSTRAINT "repas_ingredient_key_check" CHECK (char_length("key") BETWEEN 1 AND 80);
ALTER TABLE "repas_ingredient" ADD CONSTRAINT "repas_ingredient_pack_check" CHECK ("packAmount" IS NULL OR "packAmount" > 0);
ALTER TABLE "repas_dish_ingredient" ADD CONSTRAINT "repas_dish_ingredient_amount_check" CHECK ("amount" IS NULL OR "amount" > 0);
