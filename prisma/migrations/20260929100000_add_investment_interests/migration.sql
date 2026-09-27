-- CreateEnum
CREATE TYPE "InvestmentCategory" AS ENUM ('FARMING_SEASON', 'FRESH_PRODUCE', 'GRAINS', 'LIVESTOCK', 'EXPORT_LOGISTICS', 'WAREHOUSING', 'PROCESSING');

-- CreateEnum
CREATE TYPE "InvestorType" AS ENUM ('INDIVIDUAL', 'BUSINESS', 'INSTITUTION', 'NGO', 'GOVERNMENT');

-- CreateEnum
CREATE TYPE "InvestmentInterestStatus" AS ENUM ('NEW', 'IN_REVIEW', 'CONTACTED', 'CLOSED');

-- CreateTable
CREATE TABLE "InvestmentOpportunity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "InvestmentCategory" NOT NULL,
    "location" TEXT,
    "imageUrl" TEXT,
    "fundingTarget" INTEGER,
    "minimumInterestAmount" INTEGER,
    "durationMonths" INTEGER,
    "riskSummary" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "openForInterest" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentInterest" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "investorType" "InvestorType" NOT NULL,
    "organizationName" TEXT,
    "phone" TEXT NOT NULL,
    "indicativeAmount" INTEGER,
    "message" TEXT NOT NULL,
    "status" "InvestmentInterestStatus" NOT NULL DEFAULT 'NEW',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentOpportunity_slug_key" ON "InvestmentOpportunity"("slug");

-- CreateIndex
CREATE INDEX "InvestmentOpportunity_category_publishedAt_idx" ON "InvestmentOpportunity"("category", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentInterest_opportunityId_customerId_key" ON "InvestmentInterest"("opportunityId", "customerId");

-- CreateIndex
CREATE INDEX "InvestmentInterest_status_createdAt_idx" ON "InvestmentInterest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "InvestmentInterest" ADD CONSTRAINT "InvestmentInterest_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "InvestmentOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentInterest" ADD CONSTRAINT "InvestmentInterest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
