-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CHECKING', 'SAVINGS');

-- CreateEnum
CREATE TYPE "CategoryKind" AS ENUM ('EXPENSE', 'INCOME');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PLANNED', 'CLEARED');

-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "finances_account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "initialBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "initialBalanceDate" DATE NOT NULL,
    "parentId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finances_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finances_category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "CategoryKind" NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finances_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finances_transaction" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "dayUnknown" BOOLEAN NOT NULL DEFAULT false,
    "amountCents" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "label" TEXT NOT NULL,
    "labelKey" TEXT NOT NULL,
    "note" TEXT,
    "accountId" TEXT NOT NULL,
    "toAccountId" TEXT,
    "categoryId" TEXT,
    "recurringRuleId" TEXT,
    "occurrenceDate" DATE,
    "importBatchId" TEXT,
    "importRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finances_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finances_recurring_rule" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "note" TEXT,
    "amountCents" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "accountId" TEXT NOT NULL,
    "toAccountId" TEXT,
    "categoryId" TEXT,
    "frequency" "RecurrenceFrequency" NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "monthOfYear" INTEGER,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finances_recurring_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finances_import_batch" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowCount" INTEGER NOT NULL,

    CONSTRAINT "finances_import_batch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finances_account_parentId_idx" ON "finances_account"("parentId");

-- CreateIndex
CREATE INDEX "finances_category_parentId_idx" ON "finances_category"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "finances_category_kind_parentId_name_key" ON "finances_category"("kind", "parentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "finances_transaction_importRef_key" ON "finances_transaction"("importRef");

-- CreateIndex
CREATE INDEX "finances_transaction_date_idx" ON "finances_transaction"("date");

-- CreateIndex
CREATE INDEX "finances_transaction_accountId_date_idx" ON "finances_transaction"("accountId", "date");

-- CreateIndex
CREATE INDEX "finances_transaction_toAccountId_date_idx" ON "finances_transaction"("toAccountId", "date");

-- CreateIndex
CREATE INDEX "finances_transaction_categoryId_idx" ON "finances_transaction"("categoryId");

-- CreateIndex
CREATE INDEX "finances_transaction_labelKey_idx" ON "finances_transaction"("labelKey");

-- CreateIndex
CREATE UNIQUE INDEX "finances_transaction_recurringRuleId_occurrenceDate_key" ON "finances_transaction"("recurringRuleId", "occurrenceDate");

-- AddForeignKey
ALTER TABLE "finances_account" ADD CONSTRAINT "finances_account_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "finances_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finances_category" ADD CONSTRAINT "finances_category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "finances_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finances_transaction" ADD CONSTRAINT "finances_transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "finances_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finances_transaction" ADD CONSTRAINT "finances_transaction_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "finances_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finances_transaction" ADD CONSTRAINT "finances_transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "finances_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finances_transaction" ADD CONSTRAINT "finances_transaction_recurringRuleId_fkey" FOREIGN KEY ("recurringRuleId") REFERENCES "finances_recurring_rule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finances_transaction" ADD CONSTRAINT "finances_transaction_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "finances_import_batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finances_recurring_rule" ADD CONSTRAINT "finances_recurring_rule_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "finances_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finances_recurring_rule" ADD CONSTRAINT "finances_recurring_rule_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "finances_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finances_recurring_rule" ADD CONSTRAINT "finances_recurring_rule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "finances_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Business rules Prisma cannot express (hand-written CHECK constraints)
ALTER TABLE "finances_account" ADD CONSTRAINT "finances_account_not_own_parent_check" CHECK ("parentId" IS NULL OR "parentId" <> "id");

ALTER TABLE "finances_transaction" ADD CONSTRAINT "finances_transaction_amount_positive_check" CHECK ("amountCents" > 0);
ALTER TABLE "finances_transaction" ADD CONSTRAINT "finances_transaction_shape_check" CHECK (
    ("type" = 'TRANSFER' AND "toAccountId" IS NOT NULL AND "toAccountId" <> "accountId" AND "categoryId" IS NULL)
    OR ("type" <> 'TRANSFER' AND "toAccountId" IS NULL AND "categoryId" IS NOT NULL)
);

ALTER TABLE "finances_recurring_rule" ADD CONSTRAINT "finances_recurring_rule_amount_positive_check" CHECK ("amountCents" > 0);
ALTER TABLE "finances_recurring_rule" ADD CONSTRAINT "finances_recurring_rule_shape_check" CHECK (
    ("type" = 'TRANSFER' AND "toAccountId" IS NOT NULL AND "toAccountId" <> "accountId" AND "categoryId" IS NULL)
    OR ("type" <> 'TRANSFER' AND "toAccountId" IS NULL AND "categoryId" IS NOT NULL)
);
ALTER TABLE "finances_recurring_rule" ADD CONSTRAINT "finances_recurring_rule_schedule_check" CHECK (
    "dayOfMonth" BETWEEN 1 AND 31
    AND (("frequency" = 'YEARLY' AND "monthOfYear" BETWEEN 1 AND 12) OR ("frequency" = 'MONTHLY' AND "monthOfYear" IS NULL))
    AND ("endDate" IS NULL OR "endDate" >= "startDate")
);
