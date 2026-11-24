-- Photo of a dish (one per dish), shown on the meals of that dish.
-- Stored in the database (bytea): backed up with the daily pg_dump, no extra volume.
CREATE TABLE "repas_dish_photo" (
    "dishId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repas_dish_photo_pkey" PRIMARY KEY ("dishId"),
    CONSTRAINT "repas_dish_photo_mime_check" CHECK ("mimeType" IN ('image/jpeg', 'image/png', 'image/webp')),
    CONSTRAINT "repas_dish_photo_size_check" CHECK (octet_length("data") BETWEEN 1 AND 3145728)
);

-- AddForeignKey
ALTER TABLE "repas_dish_photo" ADD CONSTRAINT "repas_dish_photo_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "repas_dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
