-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('EQUIPMENT_RENTAL', 'JOB_BOARD', 'TRAINING', 'EXPORT_LOGISTICS', 'INPUT_SUPPLY', 'WAREHOUSING', 'SMART_FARMING', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "ServiceEnquiryStatus" AS ENUM ('NEW', 'IN_REVIEW', 'CONTACTED', 'CLOSED');

-- CreateTable
CREATE TABLE "ServiceListing" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "providerName" TEXT NOT NULL,
    "location" TEXT,
    "imageUrl" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceEnquiry" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ServiceEnquiryStatus" NOT NULL DEFAULT 'NEW',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceListing_slug_key" ON "ServiceListing"("slug");

-- CreateIndex
CREATE INDEX "ServiceListing_category_publishedAt_idx" ON "ServiceListing"("category", "publishedAt");

-- CreateIndex
CREATE INDEX "ServiceEnquiry_customerId_createdAt_idx" ON "ServiceEnquiry"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceEnquiry_status_createdAt_idx" ON "ServiceEnquiry"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "ServiceEnquiry" ADD CONSTRAINT "ServiceEnquiry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEnquiry" ADD CONSTRAINT "ServiceEnquiry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
