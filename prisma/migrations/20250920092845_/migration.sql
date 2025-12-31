-- AlterTable
ALTER TABLE "help_and_supports" ALTER COLUMN "status" SET DEFAULT 'unsolved';

-- AlterTable
ALTER TABLE "reschedule_sessions" ADD COLUMN     "create_session_id" TEXT;

-- AddForeignKey
ALTER TABLE "reschedule_sessions" ADD CONSTRAINT "reschedule_sessions_create_session_id_fkey" FOREIGN KEY ("create_session_id") REFERENCES "create_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
