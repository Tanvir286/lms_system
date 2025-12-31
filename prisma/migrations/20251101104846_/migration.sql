-- DropForeignKey
ALTER TABLE "create_sessions" DROP CONSTRAINT "create_sessions_user_id_fkey";

-- AddForeignKey
ALTER TABLE "create_sessions" ADD CONSTRAINT "create_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
