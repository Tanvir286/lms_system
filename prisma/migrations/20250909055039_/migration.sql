/*
  Warnings:

  - A unique constraint covering the columns `[user_id,book_session_id]` on the table `reschedule_sessions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "reschedule_sessions_user_id_book_session_id_key" ON "reschedule_sessions"("user_id", "book_session_id");
