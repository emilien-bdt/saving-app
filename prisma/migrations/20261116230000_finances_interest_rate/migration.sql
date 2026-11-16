-- CreateTable
CREATE TABLE "finances_interest_rate" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "validFrom" DATE NOT NULL,
    "rateBp" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finances_interest_rate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "finances_interest_rate_accountId_validFrom_key" ON "finances_interest_rate"("accountId", "validFrom");

-- AddForeignKey
ALTER TABLE "finances_interest_rate" ADD CONSTRAINT "finances_interest_rate_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "finances_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Business rule Prisma cannot express (hand-written CHECK constraint): rate between 0 % and 100 %.
ALTER TABLE "finances_interest_rate" ADD CONSTRAINT "finances_interest_rate_range_check" CHECK ("rateBp" BETWEEN 0 AND 10000);
