-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "refundAmountXof" DECIMAL(12,2),
ADD COLUMN     "refundReason" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "refundedByUserId" TEXT;
