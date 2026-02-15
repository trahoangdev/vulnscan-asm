/*
  Warnings:

  - You are about to drop the column `stripe_customer_id` on the `organizations` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_sub_id` on the `organizations` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ReportFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "AlertEventType" AS ENUM ('NEW_VULNERABILITY', 'SCAN_COMPLETED', 'SCAN_FAILED', 'CERT_EXPIRING', 'NEW_ASSET_DISCOVERED', 'SEVERITY_THRESHOLD');

-- AlterTable
ALTER TABLE "organizations" DROP COLUMN "stripe_customer_id",
DROP COLUMN "stripe_sub_id",
ADD COLUMN     "polar_customer_id" TEXT,
ADD COLUMN     "polar_sub_id" TEXT;

-- AlterTable
ALTER TABLE "scans" ADD COLUMN     "scan_config" JSONB;

-- CreateTable
CREATE TABLE "scheduled_reports" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" "ReportFrequency" NOT NULL DEFAULT 'WEEKLY',
    "format" TEXT NOT NULL DEFAULT 'html',
    "recipients" JSONB NOT NULL DEFAULT '[]',
    "filters" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_retention_policies" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "scan_retention_days" INTEGER NOT NULL DEFAULT 365,
    "finding_retention_days" INTEGER NOT NULL DEFAULT 730,
    "asset_retention_days" INTEGER NOT NULL DEFAULT 365,
    "audit_log_retention_days" INTEGER NOT NULL DEFAULT 90,
    "last_cleanup_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "event_type" "AlertEventType" NOT NULL,
    "severity_filter" "Severity"[] DEFAULT ARRAY['CRITICAL', 'HIGH']::"Severity"[],
    "target_filter" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category_filter" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "threshold" INTEGER NOT NULL DEFAULT 1,
    "time_window_mins" INTEGER NOT NULL DEFAULT 60,
    "channels" TEXT[] DEFAULT ARRAY['in_app']::TEXT[],
    "webhook_url" TEXT,
    "email_recipients" JSONB,
    "slack_channel" TEXT,
    "last_triggered_at" TIMESTAMP(3),
    "trigger_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_reports_org_id_is_active_idx" ON "scheduled_reports"("org_id", "is_active");

-- CreateIndex
CREATE INDEX "scheduled_reports_next_run_at_idx" ON "scheduled_reports"("next_run_at");

-- CreateIndex
CREATE UNIQUE INDEX "data_retention_policies_org_id_key" ON "data_retention_policies"("org_id");

-- CreateIndex
CREATE INDEX "alert_rules_org_id_is_active_idx" ON "alert_rules"("org_id", "is_active");

-- CreateIndex
CREATE INDEX "alert_rules_event_type_idx" ON "alert_rules"("event_type");

-- AddForeignKey
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_retention_policies" ADD CONSTRAINT "data_retention_policies_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
