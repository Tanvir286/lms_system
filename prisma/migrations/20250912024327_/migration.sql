-- CreateTable
CREATE TABLE "rate_sessions" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "user_id" TEXT,
    "book_session_id" TEXT,
    "rating" INTEGER,
    "comment" TEXT,

    CONSTRAINT "rate_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rate_sessions_user_id_book_session_id_key" ON "rate_sessions"("user_id", "book_session_id");

-- AddForeignKey
ALTER TABLE "rate_sessions" ADD CONSTRAINT "rate_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_sessions" ADD CONSTRAINT "rate_sessions_book_session_id_fkey" FOREIGN KEY ("book_session_id") REFERENCES "book_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
