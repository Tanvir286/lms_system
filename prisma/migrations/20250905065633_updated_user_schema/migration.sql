-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_accepted" INTEGER DEFAULT 0,
ALTER COLUMN "email" DROP NOT NULL;
