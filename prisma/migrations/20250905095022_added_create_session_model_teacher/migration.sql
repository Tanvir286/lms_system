-- CreateEnum
CREATE TYPE "Mode" AS ENUM ('Virtual', 'In_Person');

-- CreateTable
CREATE TABLE "create_sessions" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "user_id" TEXT,
    "session_type" TEXT,
    "subject" TEXT,
    "session_charge" TEXT,
    "mode" "Mode" DEFAULT 'Virtual',
    "join_link" TEXT,
    "available_slots_time_and_date" TIMESTAMP(3)[],

    CONSTRAINT "create_sessions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "create_sessions" ADD CONSTRAINT "create_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
