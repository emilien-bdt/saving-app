-- CreateEnum
CREATE TYPE "TodoPriority" AS ENUM ('NORMAL', 'HIGH');

-- CreateTable
CREATE TABLE "todo_list" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "todo_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "todo_task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "dueDate" DATE,
    "priority" "TodoPriority" NOT NULL DEFAULT 'NORMAL',
    "listId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "todo_task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "todo_list_name_key" ON "todo_list"("name");

-- CreateIndex
CREATE INDEX "todo_task_completedAt_dueDate_idx" ON "todo_task"("completedAt", "dueDate");

-- CreateIndex
CREATE INDEX "todo_task_listId_idx" ON "todo_task"("listId");

-- AddForeignKey
ALTER TABLE "todo_task" ADD CONSTRAINT "todo_task_listId_fkey" FOREIGN KEY ("listId") REFERENCES "todo_list"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Business rules Prisma cannot express (hand-written CHECK constraints).
ALTER TABLE "todo_list" ADD CONSTRAINT "todo_list_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 60);
ALTER TABLE "todo_list" ADD CONSTRAINT "todo_list_color_check" CHECK ("color" ~ '^#[0-9a-fA-F]{6}$');
ALTER TABLE "todo_task" ADD CONSTRAINT "todo_task_title_check" CHECK (char_length(btrim("title")) BETWEEN 1 AND 200);
ALTER TABLE "todo_task" ADD CONSTRAINT "todo_task_note_check" CHECK ("note" IS NULL OR char_length("note") <= 2000);
