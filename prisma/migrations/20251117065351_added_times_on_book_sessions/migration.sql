-- AlterTable
ALTER TABLE "book_sessions" ADD COLUMN     "ended_at" TIMESTAMPTZ,
ADD COLUMN     "joined_at" TIMESTAMPTZ,
ADD COLUMN     "started_at" TIMESTAMPTZ;
