-- AlterTable
ALTER TABLE "reschedule_sessions" ADD COLUMN     "user_id" TEXT;

-- AddForeignKey
ALTER TABLE "reschedule_sessions" ADD CONSTRAINT "reschedule_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
