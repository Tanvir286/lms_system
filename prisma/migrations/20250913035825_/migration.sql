-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_restricted" INTEGER DEFAULT 0,
ADD COLUMN     "restriction_period" TIMESTAMP(3),
ADD COLUMN     "restriction_reason" TEXT;
