-- AlterTable
ALTER TABLE "book_sessions" ADD COLUMN     "is_joined" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "create_sessions" ADD COLUMN     "is_completed" INTEGER DEFAULT 0;
