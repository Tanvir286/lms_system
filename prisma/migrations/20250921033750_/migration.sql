-- AlterTable
ALTER TABLE "book_sessions" ADD COLUMN     "payment_status" TEXT DEFAULT 'pending',
ADD COLUMN     "transaction_id" TEXT;
