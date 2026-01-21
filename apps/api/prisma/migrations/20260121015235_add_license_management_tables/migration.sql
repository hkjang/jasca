-- CreateEnum
CREATE TYPE "LicenseClassification" AS ENUM ('FORBIDDEN', 'RESTRICTED', 'RECIPROCAL', 'NOTICE', 'PERMISSIVE', 'UNENCUMBERED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "LicenseRuleType" AS ENUM ('SPECIFIC_LICENSE', 'CLASSIFICATION', 'UNKNOWN_LICENSE');

-- CreateEnum
CREATE TYPE "LicensePolicyAction" AS ENUM ('ALLOW', 'WARN', 'BLOCK');

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "spdxId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "classification" "LicenseClassification" NOT NULL,
    "description" TEXT,
    "osiApproved" BOOLEAN NOT NULL DEFAULT false,
    "fsfLibre" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageLicense" (
    "id" TEXT NOT NULL,
    "scanResultId" TEXT NOT NULL,
    "licenseId" TEXT,
    "licenseName" TEXT NOT NULL,
    "pkgName" TEXT NOT NULL,
    "pkgVersion" TEXT NOT NULL,
    "pkgPath" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicensePolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicensePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicensePolicyRule" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "ruleType" "LicenseRuleType" NOT NULL,
    "licenseId" TEXT,
    "classification" "LicenseClassification",
    "action" "LicensePolicyAction" NOT NULL,
    "message" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicensePolicyRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "License_spdxId_key" ON "License"("spdxId");

-- CreateIndex
CREATE INDEX "License_spdxId_idx" ON "License"("spdxId");

-- CreateIndex
CREATE INDEX "License_classification_idx" ON "License"("classification");

-- CreateIndex
CREATE INDEX "PackageLicense_scanResultId_idx" ON "PackageLicense"("scanResultId");

-- CreateIndex
CREATE INDEX "PackageLicense_licenseId_idx" ON "PackageLicense"("licenseId");

-- CreateIndex
CREATE INDEX "PackageLicense_pkgName_idx" ON "PackageLicense"("pkgName");

-- CreateIndex
CREATE INDEX "PackageLicense_licenseName_idx" ON "PackageLicense"("licenseName");

-- CreateIndex
CREATE INDEX "PackageLicense_scanResultId_licenseId_idx" ON "PackageLicense"("scanResultId", "licenseId");

-- CreateIndex
CREATE INDEX "PackageLicense_createdAt_idx" ON "PackageLicense"("createdAt");

-- CreateIndex
CREATE INDEX "PackageLicense_licenseId_createdAt_idx" ON "PackageLicense"("licenseId", "createdAt");

-- CreateIndex
CREATE INDEX "LicensePolicy_organizationId_idx" ON "LicensePolicy"("organizationId");

-- CreateIndex
CREATE INDEX "LicensePolicy_projectId_idx" ON "LicensePolicy"("projectId");

-- CreateIndex
CREATE INDEX "LicensePolicy_isActive_idx" ON "LicensePolicy"("isActive");

-- CreateIndex
CREATE INDEX "LicensePolicyRule_policyId_idx" ON "LicensePolicyRule"("policyId");

-- CreateIndex
CREATE INDEX "LicensePolicyRule_ruleType_idx" ON "LicensePolicyRule"("ruleType");

-- AddForeignKey
ALTER TABLE "PackageLicense" ADD CONSTRAINT "PackageLicense_scanResultId_fkey" FOREIGN KEY ("scanResultId") REFERENCES "ScanResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageLicense" ADD CONSTRAINT "PackageLicense_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicensePolicyRule" ADD CONSTRAINT "LicensePolicyRule_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "LicensePolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicensePolicyRule" ADD CONSTRAINT "LicensePolicyRule_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE SET NULL ON UPDATE CASCADE;
