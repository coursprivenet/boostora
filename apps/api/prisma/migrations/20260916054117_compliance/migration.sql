-- AlterTable
ALTER TABLE "catalog_services" ADD COLUMN     "riskWarning" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);
