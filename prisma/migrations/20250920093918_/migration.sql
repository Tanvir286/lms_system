/*
  Warnings:

  - You are about to drop the column `create_session_id` on the `reschedule_sessions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "reschedule_sessions" DROP CONSTRAINT "reschedule_sessions_create_session_id_fkey";

-- AlterTable
ALTER TABLE "rate_sessions" ADD COLUMN     "create_session_id" TEXT;

-- AlterTable
ALTER TABLE "reschedule_sessions" DROP COLUMN "create_session_id";

-- AddForeignKey
ALTER TABLE "rate_sessions" ADD CONSTRAINT "rate_sessions_create_session_id_fkey" FOREIGN KEY ("create_session_id") REFERENCES "create_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
