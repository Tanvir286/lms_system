-- AlterTable
ALTER TABLE "create_sessions" ADD COLUMN     "pdf_attachment" TEXT[],
ADD COLUMN     "slots_available" TEXT;

-- CreateTable
CREATE TABLE "book_sessions" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "username" TEXT,
    "subject" TEXT,
    "user_id" TEXT,
    "create_session_id" TEXT,
    "session_date" TIMESTAMP(3),
    "status" TEXT DEFAULT 'pending',

    CONSTRAINT "book_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reschedule_sessions" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "username" TEXT,
    "subject" TEXT,
    "book_session_id" TEXT,
    "rescheduled_date" TIMESTAMP(3),
    "reason" TEXT,
    "is_accepted" INTEGER DEFAULT 0,
    "is_rejected" INTEGER DEFAULT 0,
    "reject_reason" TEXT,

    CONSTRAINT "reschedule_sessions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "book_sessions" ADD CONSTRAINT "book_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_sessions" ADD CONSTRAINT "book_sessions_create_session_id_fkey" FOREIGN KEY ("create_session_id") REFERENCES "create_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reschedule_sessions" ADD CONSTRAINT "reschedule_sessions_book_session_id_fkey" FOREIGN KEY ("book_session_id") REFERENCES "book_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
