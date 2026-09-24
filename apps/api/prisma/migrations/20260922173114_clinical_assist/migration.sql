-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'NOTE_DRAFT_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'RECORD_SUMMARY_GENERATED';

-- AlterTable
ALTER TABLE "ConsultationNote" ADD COLUMN     "aiAssisted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ConsultationNoteDraft" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "findings" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "followUp" TEXT,
    "extractionCandidates" JSONB NOT NULL DEFAULT '[]',
    "model" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationNoteDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationNoteSummary" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "noteUpdatedAt" TIMESTAMP(3) NOT NULL,
    "model" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationNoteSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationNoteDraft_appointmentId_key" ON "ConsultationNoteDraft"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationNoteSummary_appointmentId_key" ON "ConsultationNoteSummary"("appointmentId");

-- AddForeignKey
ALTER TABLE "ConsultationNoteDraft" ADD CONSTRAINT "ConsultationNoteDraft_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationNoteSummary" ADD CONSTRAINT "ConsultationNoteSummary_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
