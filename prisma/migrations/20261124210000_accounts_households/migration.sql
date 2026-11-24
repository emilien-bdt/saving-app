-- Comptes et foyers (étape 20).
-- Every existing row is given to the admin account created here ("admin", no password yet:
-- it signs in with the former AUTH_PASSWORD_HASH until it chooses its own).

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "InvitationKind" AS ENUM ('ACCOUNT', 'HOUSEHOLD', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "account_household" (
    "id" TEXT NOT NULL,
    "soloOwnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_user" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "disabledModules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "householdId" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_user_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "account_user_login_check" CHECK ("login" = lower(btrim("login")) AND length("login") BETWEEN 1 AND 254),
    CONSTRAINT "account_user_name_check" CHECK (length(btrim("name")) BETWEEN 1 AND 60)
);

-- CreateTable
CREATE TABLE "account_invitation" (
    "id" TEXT NOT NULL,
    "kind" "InvitationKind" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "name" TEXT,
    "householdId" TEXT,
    "targetUserId" TEXT,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_invitation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "account_invitation_kind_check" CHECK (
        ("kind" = 'ACCOUNT' AND "name" IS NOT NULL AND "householdId" IS NULL AND "targetUserId" IS NULL)
        OR ("kind" = 'HOUSEHOLD' AND "householdId" IS NOT NULL AND "targetUserId" IS NULL)
        OR ("kind" = 'PASSWORD_RESET' AND "targetUserId" IS NOT NULL AND "householdId" IS NULL)
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "account_household_soloOwnerId_key" ON "account_household"("soloOwnerId");

-- CreateIndex
CREATE UNIQUE INDEX "account_user_login_key" ON "account_user"("login");

-- CreateIndex
CREATE INDEX "account_user_householdId_idx" ON "account_user"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "account_invitation_tokenHash_key" ON "account_invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "account_invitation_createdById_idx" ON "account_invitation"("createdById");

-- AddForeignKey
ALTER TABLE "account_user" ADD CONSTRAINT "account_user_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "account_household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_household" ADD CONSTRAINT "account_household_soloOwnerId_fkey" FOREIGN KEY ("soloOwnerId") REFERENCES "account_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_invitation" ADD CONSTRAINT "account_invitation_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "account_household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_invitation" ADD CONSTRAINT "account_invitation_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "account_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_invitation" ADD CONSTRAINT "account_invitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "account_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The admin account and its own household (owner of every existing row).
INSERT INTO "account_household" ("id", "updatedAt") VALUES ('household_admin', CURRENT_TIMESTAMP);
INSERT INTO "account_user" ("id", "login", "name", "role", "householdId", "updatedAt")
VALUES ('user_admin', 'admin', 'Émilien', 'ADMIN', 'household_admin', CURRENT_TIMESTAMP);
UPDATE "account_household" SET "soloOwnerId" = 'user_admin' WHERE "id" = 'household_admin';

-- Finances: personal data (userId)
ALTER TABLE "finances_account" ADD COLUMN "userId" TEXT;
UPDATE "finances_account" SET "userId" = 'user_admin';
ALTER TABLE "finances_account" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "finances_category" ADD COLUMN "userId" TEXT;
UPDATE "finances_category" SET "userId" = 'user_admin';
ALTER TABLE "finances_category" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "finances_transaction" ADD COLUMN "userId" TEXT;
UPDATE "finances_transaction" SET "userId" = 'user_admin';
ALTER TABLE "finances_transaction" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "finances_recurring_rule" ADD COLUMN "userId" TEXT;
UPDATE "finances_recurring_rule" SET "userId" = 'user_admin';
ALTER TABLE "finances_recurring_rule" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "finances_import_batch" ADD COLUMN "userId" TEXT;
UPDATE "finances_import_batch" SET "userId" = 'user_admin';
ALTER TABLE "finances_import_batch" ALTER COLUMN "userId" SET NOT NULL;

-- DropIndex
DROP INDEX "finances_category_kind_parentId_name_key";
DROP INDEX "finances_transaction_date_idx";

-- CreateIndex
CREATE INDEX "finances_account_userId_idx" ON "finances_account"("userId");
CREATE UNIQUE INDEX "finances_category_userId_kind_parentId_name_key" ON "finances_category"("userId", "kind", "parentId", "name");
CREATE INDEX "finances_transaction_userId_date_idx" ON "finances_transaction"("userId", "date");
CREATE INDEX "finances_recurring_rule_userId_idx" ON "finances_recurring_rule"("userId");
CREATE INDEX "finances_import_batch_userId_idx" ON "finances_import_batch"("userId");

-- AddForeignKey
ALTER TABLE "finances_account" ADD CONSTRAINT "finances_account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "account_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finances_category" ADD CONSTRAINT "finances_category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "account_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finances_transaction" ADD CONSTRAINT "finances_transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "account_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finances_recurring_rule" ADD CONSTRAINT "finances_recurring_rule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "account_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finances_import_batch" ADD CONSTRAINT "finances_import_batch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "account_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- To do: lists and tasks belong to their creator; a list with householdId is shared
ALTER TABLE "todo_list" ADD COLUMN "userId" TEXT, ADD COLUMN "householdId" TEXT;
UPDATE "todo_list" SET "userId" = 'user_admin';
ALTER TABLE "todo_list" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "todo_task" ADD COLUMN "userId" TEXT;
UPDATE "todo_task" SET "userId" = 'user_admin';
ALTER TABLE "todo_task" ALTER COLUMN "userId" SET NOT NULL;

-- DropIndex (list names are now unique per owner / household, checked in code)
DROP INDEX "todo_list_name_key";

-- CreateIndex
CREATE INDEX "todo_list_userId_idx" ON "todo_list"("userId");
CREATE INDEX "todo_list_householdId_idx" ON "todo_list"("householdId");
CREATE INDEX "todo_task_userId_idx" ON "todo_task"("userId");

-- AddForeignKey
ALTER TABLE "todo_list" ADD CONSTRAINT "todo_list_userId_fkey" FOREIGN KEY ("userId") REFERENCES "account_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "todo_list" ADD CONSTRAINT "todo_list_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "account_household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "todo_task" ADD CONSTRAINT "todo_task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "account_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Repas: household data (householdId)
ALTER TABLE "repas_dish" ADD COLUMN "householdId" TEXT;
UPDATE "repas_dish" SET "householdId" = 'household_admin';
ALTER TABLE "repas_dish" ALTER COLUMN "householdId" SET NOT NULL;

ALTER TABLE "repas_meal" ADD COLUMN "householdId" TEXT;
UPDATE "repas_meal" SET "householdId" = 'household_admin';
ALTER TABLE "repas_meal" ALTER COLUMN "householdId" SET NOT NULL;

ALTER TABLE "repas_ingredient" ADD COLUMN "householdId" TEXT;
UPDATE "repas_ingredient" SET "householdId" = 'household_admin';
ALTER TABLE "repas_ingredient" ALTER COLUMN "householdId" SET NOT NULL;

ALTER TABLE "repas_shopping_item" ADD COLUMN "householdId" TEXT;
UPDATE "repas_shopping_item" SET "householdId" = 'household_admin';
ALTER TABLE "repas_shopping_item" ALTER COLUMN "householdId" SET NOT NULL;

-- DropIndex
DROP INDEX "repas_dish_key_key";
DROP INDEX "repas_meal_date_slot_key";
DROP INDEX "repas_ingredient_key_key";

-- CreateIndex
CREATE UNIQUE INDEX "repas_dish_householdId_key_key" ON "repas_dish"("householdId", "key");
CREATE UNIQUE INDEX "repas_meal_householdId_date_slot_key" ON "repas_meal"("householdId", "date", "slot");
CREATE UNIQUE INDEX "repas_ingredient_householdId_key_key" ON "repas_ingredient"("householdId", "key");
CREATE INDEX "repas_shopping_item_householdId_weekStart_idx" ON "repas_shopping_item"("householdId", "weekStart");

-- AddForeignKey
ALTER TABLE "repas_dish" ADD CONSTRAINT "repas_dish_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "account_household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repas_meal" ADD CONSTRAINT "repas_meal_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "account_household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repas_ingredient" ADD CONSTRAINT "repas_ingredient_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "account_household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repas_shopping_item" ADD CONSTRAINT "repas_shopping_item_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "account_household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
