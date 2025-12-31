-- AlterTable
ALTER TABLE "create_sessions" ADD COLUMN     "is_restricted" INTEGER DEFAULT 0,
ADD COLUMN     "restriction_reason" TEXT;
