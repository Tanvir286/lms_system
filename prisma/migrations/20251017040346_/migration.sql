-- AlterTable
ALTER TABLE "users" ALTER COLUMN "is_accepted" SET DEFAULT 'pending',
ALTER COLUMN "is_accepted" SET DATA TYPE TEXT;
