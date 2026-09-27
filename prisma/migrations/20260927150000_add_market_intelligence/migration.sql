-- CreateEnum
CREATE TYPE "MarketInsightType" AS ENUM ('COMMODITY_PRICE', 'AGRICULTURE_NEWS', 'EXPORT_OPPORTUNITY', 'WEATHER_ADVISORY');

-- CreateTable
CREATE TABLE "MarketInsight" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "MarketInsightType" NOT NULL,
    "imageUrl" TEXT,
    "location" TEXT,
    "commodity" TEXT,
    "dataValue" TEXT,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketInsight_slug_key" ON "MarketInsight"("slug");

-- CreateIndex
CREATE INDEX "MarketInsight_type_publishedAt_idx" ON "MarketInsight"("type", "publishedAt");
