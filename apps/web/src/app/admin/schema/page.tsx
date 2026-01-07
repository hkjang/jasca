'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  FileCode,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { ERDViewer } from '@/components/admin/erd-viewer';

// Schema content - this should ideally come from an API endpoint
// For now, we'll fetch it from a static path or use embedded content
const SCHEMA_PATH = '/api/schema';

export default function SchemaPage() {
  const [schemaContent, setSchemaContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchema = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Try to fetch from API first
        const response = await fetch(SCHEMA_PATH);
        if (response.ok) {
          const data = await response.json();
          setSchemaContent(data.content);
        } else {
          // Fallback: use embedded schema content
          setSchemaContent(getEmbeddedSchema());
        }
      } catch {
        // Use embedded schema on error
        setSchemaContent(getEmbeddedSchema());
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchema();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">스키마 / ERD</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              데이터베이스 스키마 구조를 시각적으로 확인합니다
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-96 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto" />
            <p className="mt-2 text-slate-600 dark:text-slate-400">스키마 로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">스키마 / ERD</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              데이터베이스 스키마 구조를 시각적으로 확인합니다
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-96 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
            <p className="mt-2 text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">스키마 / ERD</h1>
            <p className="text-slate-500 dark:text-slate-400">
              데이터베이스 스키마 구조를 시각적으로 확인합니다
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-600 dark:text-slate-400">
            <FileCode className="h-4 w-4" />
            <span>schema.prisma</span>
          </div>
        </div>
      </div>

      {/* ERD Viewer */}
      <div className="flex-1 min-h-0">
        <ERDViewer schemaContent={schemaContent} />
      </div>
    </div>
  );
}

/**
 * Embedded schema content - this is a fallback when API is not available
 * In production, this should be generated at build time or fetched from API
 */
function getEmbeddedSchema(): string {
  return `// Prisma Schema for JASCA - Trivy Vulnerability Management System

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// Organization & Project Models
// ============================================

model Organization {
  id          String    @id @default(uuid())
  name        String
  slug        String    @unique
  description String?
  
  projects    Project[]
  users       User[]
  policies    Policy[]
  apiTokens   ApiToken[]
  auditLogs   AuditLog[]
  riskScoreConfig RiskScoreConfig?
  gitIntegrations GitIntegration[]
  issueTrackerIntegrations IssueTrackerIntegration[]
  
  invitations     UserInvitation[]
  ssoConfigs      SsoConfig[]
  ipWhitelists    IpWhitelist[]
  passwordPolicy  PasswordPolicy?
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([slug])
}

model Project {
  id             String    @id @default(uuid())
  name           String
  slug           String
  description    String?
  
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  registries     Registry[]
  scanResults    ScanResult[]
  policies       Policy[]
  assetCriticality AssetCriticality?
  gitRepositories GitRepository[]
  
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  @@unique([organizationId, slug])
  @@index([organizationId])
}

model Registry {
  id          String    @id @default(uuid())
  name        String
  url         String
  type        RegistryType @default(DOCKER_HUB)
  
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([projectId])
}

enum RegistryType {
  DOCKER_HUB
  HARBOR
  ECR
  GCR
  ACR
  NEXUS
  ARTIFACTORY
  OTHER
}

// ============================================
// User & Authentication Models
// ============================================

model User {
  id             String    @id @default(uuid())
  email          String    @unique
  passwordHash   String
  name           String
  isActive       Boolean   @default(true)
  
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)
  
  roles          UserRole[]
  assignedVulns  ScanVulnerability[] @relation("AssignedTo")
  comments       VulnerabilityComment[]
  exceptions     PolicyException[] @relation("ApprovedBy")
  requestedExceptions PolicyException[] @relation("RequestedBy")
  auditLogs      AuditLog[]
  bookmarks      VulnerabilityBookmark[]
  workflowChanges VulnerabilityWorkflow[] @relation("WorkflowChangedBy")
  evidenceCreated FixEvidence[] @relation("EvidenceCreatedBy")
  
  emailVerification   EmailVerification?
  mfa                 UserMfa?
  sessions            UserSession[]
  loginHistory        LoginHistory[]
  passwordHistory     PasswordHistory[]
  sentInvitations     UserInvitation[] @relation("InvitedBy")
  notifications       UserNotification[]
  
  emailVerifiedAt     DateTime?
  passwordChangedAt   DateTime?
  lockedUntil         DateTime?
  failedLoginAttempts Int       @default(0)
  
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  lastLoginAt    DateTime?
  
  @@index([email])
  @@index([organizationId])
}

model UserRole {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      Role
  scope     RoleScope @default(ORGANIZATION)
  scopeId   String?
  
  createdAt DateTime @default(now())
  
  @@unique([userId, role, scope, scopeId])
  @@index([userId])
}

enum Role {
  SYSTEM_ADMIN
  ORG_ADMIN
  SECURITY_ADMIN
  PROJECT_ADMIN
  DEVELOPER
  VIEWER
}

enum RoleScope {
  GLOBAL
  SYSTEM
  ORGANIZATION
  PROJECT
}

model ApiToken {
  id             String    @id @default(uuid())
  name           String
  tokenHash      String    @unique
  tokenPrefix    String
  
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  permissions    String[]
  expiresAt      DateTime?
  lastUsedAt     DateTime?
  
  createdAt      DateTime  @default(now())
  
  @@index([tokenHash])
  @@index([organizationId])
}

// ============================================
// Scan & Vulnerability Models
// ============================================

model ScanResult {
  id              String    @id @default(uuid())
  
  projectId       String
  project         Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  imageRef        String
  imageDigest     String?
  tag             String?
  commitHash      String?
  branch          String?
  ciPipeline      String?
  ciJobUrl        String?
  
  sourceType      SourceType
  trivyVersion    String?
  schemaVersion   String?
  
  rawResult       Json
  artifactName    String?
  artifactType    String?
  
  uploaderIp      String?
  uploadedById    String?
  userAgent       String?
  
  summary         ScanSummary?
  vulnerabilities ScanVulnerability[]
  
  scannedAt       DateTime  @default(now())
  createdAt       DateTime  @default(now())
  
  @@index([projectId, createdAt])
  @@index([imageRef])
  @@index([imageDigest])
}

model ScanSummary {
  id           String     @id @default(uuid())
  scanResultId String     @unique
  scanResult   ScanResult @relation(fields: [scanResultId], references: [id], onDelete: Cascade)
  
  totalVulns   Int        @default(0)
  critical     Int        @default(0)
  high         Int        @default(0)
  medium       Int        @default(0)
  low          Int        @default(0)
  unknown      Int        @default(0)
}

enum SourceType {
  TRIVY_JSON
  TRIVY_SARIF
  CI_BAMBOO
  CI_GITLAB
  CI_JENKINS
  CI_GITHUB_ACTIONS
  MANUAL
}

model Vulnerability {
  id              String    @id @default(uuid())
  cveId           String    @unique
  
  title           String?
  description     String?
  severity        Severity
  
  cvssV2Score     Float?
  cvssV2Vector    String?
  cvssV3Score     Float?
  cvssV3Vector    String?
  
  references      String[]
  cweIds          String[]
  
  publishedAt     DateTime?
  lastModifiedAt  DateTime?
  
  isZeroDay         Boolean   @default(false)
  zeroDetectedAt    DateTime?
  exploitAvailable  Boolean   @default(false)
  
  scanResults     ScanVulnerability[]
  impact          VulnerabilityImpact?
  mitreMapping    MitreMapping[]
  bookmarks       VulnerabilityBookmark[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([cveId])
  @@index([severity])
  @@index([isZeroDay])
}

enum Severity {
  CRITICAL
  HIGH
  MEDIUM
  LOW
  UNKNOWN
}

model ScanVulnerability {
  id                String    @id @default(uuid())
  
  scanResultId      String
  scanResult        ScanResult @relation(fields: [scanResultId], references: [id], onDelete: Cascade)
  
  vulnerabilityId   String
  vulnerability     Vulnerability @relation(fields: [vulnerabilityId], references: [id], onDelete: Cascade)
  
  pkgName           String
  pkgVersion        String
  fixedVersion      String?
  pkgPath           String?
  layer             Json?
  
  status            VulnStatus @default(OPEN)
  assigneeId        String?
  assignee          User?      @relation("AssignedTo", fields: [assigneeId], references: [id], onDelete: SetNull)
  
  vulnHash          String
  
  comments          VulnerabilityComment[]
  workflowHistory   VulnerabilityWorkflow[]
  fixEvidence       FixEvidence[]
  linkedIssues      LinkedIssue[]
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  @@unique([scanResultId, vulnHash])
  @@index([scanResultId])
  @@index([vulnerabilityId])
  @@index([status])
  @@index([assigneeId])
}

enum VulnStatus {
  OPEN
  ASSIGNED
  IN_PROGRESS
  FIX_SUBMITTED
  VERIFYING
  FIXED
  CLOSED
  IGNORED
  FALSE_POSITIVE
}

model VulnerabilityComment {
  id                  String    @id @default(uuid())
  
  scanVulnerabilityId String
  scanVulnerability   ScanVulnerability @relation(fields: [scanVulnerabilityId], references: [id], onDelete: Cascade)
  
  authorId            String
  author              User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  
  content             String
  
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  
  @@index([scanVulnerabilityId])
}

// ============================================
// Policy Models
// ============================================

enum Environment {
  ALL
  DEVELOPMENT
  STAGING
  PRODUCTION
}

model Policy {
  id             String    @id @default(uuid())
  name           String
  description    String?
  isActive       Boolean   @default(true)
  
  environment    Environment @default(ALL)
  
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  projectId      String?
  project        Project?  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  parentPolicyId String?
  parentPolicy   Policy?   @relation("PolicyInheritance", fields: [parentPolicyId], references: [id])
  childPolicies  Policy[]  @relation("PolicyInheritance")
  isInherited    Boolean   @default(false)
  
  rules          PolicyRule[]
  exceptions     PolicyException[]
  
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  @@index([organizationId])
  @@index([projectId])
  @@index([environment])
}

model PolicyRule {
  id             String    @id @default(uuid())
  
  policyId       String
  policy         Policy    @relation(fields: [policyId], references: [id], onDelete: Cascade)
  
  ruleType       PolicyRuleType
  
  conditions     Json
  
  action         PolicyAction
  message        String?
  
  priority       Int       @default(0)
  
  sendNotification Boolean @default(false)
  
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  @@index([policyId])
}

enum PolicyRuleType {
  SEVERITY_THRESHOLD
  CVSS_THRESHOLD
  CVE_BLOCKLIST
  PACKAGE_BLOCKLIST
  CVE_AGE
  CUSTOM
}

enum PolicyAction {
  BLOCK
  WARN
  INFO
  ALLOW
}

model PolicyException {
  id             String    @id @default(uuid())
  
  policyId       String
  policy         Policy    @relation(fields: [policyId], references: [id], onDelete: Cascade)
  
  exceptionType  ExceptionType
  targetValue    String
  
  reason         String
  
  status         ExceptionStatus @default(PENDING)
  requestedById  String
  requestedBy    User      @relation("RequestedBy", fields: [requestedById], references: [id])
  approvedById   String?
  approvedBy     User?     @relation("ApprovedBy", fields: [approvedById], references: [id])
  
  expiresAt      DateTime?
  isExpired      Boolean   @default(false)
  
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  @@index([policyId])
  @@index([status])
  @@index([expiresAt])
}

enum ExceptionType {
  CVE
  PACKAGE
  IMAGE
  SEVERITY
}

enum ExceptionStatus {
  PENDING
  APPROVED
  REJECTED
  EXPIRED
}

// ============================================
// Notification Models
// ============================================

model NotificationChannel {
  id             String    @id @default(uuid())
  name           String
  type           ChannelType
  
  config         Json
  
  isActive       Boolean   @default(true)
  
  rules          NotificationRule[]
  
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

enum ChannelType {
  SLACK
  MATTERMOST
  EMAIL
  WEBHOOK
}

model NotificationRule {
  id             String    @id @default(uuid())
  
  channelId      String
  channel        NotificationChannel @relation(fields: [channelId], references: [id], onDelete: Cascade)
  
  eventType      NotificationEventType
  conditions     Json?
  
  isActive       Boolean   @default(true)
  
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  @@index([channelId])
}

enum NotificationEventType {
  NEW_CRITICAL_VULN
  NEW_HIGH_VULN
  POLICY_VIOLATION
  EXCEPTION_REQUESTED
  EXCEPTION_APPROVED
  EXCEPTION_EXPIRING
  SCAN_COMPLETED
}

model UserNotification {
  id             String    @id @default(uuid())
  
  userId         String
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  type           String
  title          String
  message        String
  link           String?
  
  isRead         Boolean   @default(false)
  
  createdAt      DateTime  @default(now())
  
  @@index([userId])
  @@index([userId, isRead])
  @@index([createdAt])
}

// ============================================
// Audit Log
// ============================================

model AuditLog {
  id             String    @id @default(uuid())
  
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)
  
  userId         String?
  user           User?     @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  action         String
  resource       String
  resourceId     String?
  
  details        Json?
  ipAddress      String?
  userAgent      String?
  
  createdAt      DateTime  @default(now())
  
  @@index([organizationId, createdAt])
  @@index([userId])
  @@index([action])
  @@index([resource])
}

// ============================================
// Report Models
// ============================================

model ReportTemplate {
  id             String    @id @default(uuid())
  name           String
  description    String?
  
  type           ReportType
  config         Json
  
  isSystem       Boolean   @default(false)
  
  reports        Report[]
  
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

enum ReportType {
  VULNERABILITY_SUMMARY
  TREND_ANALYSIS
  COMPLIANCE_AUDIT
  PROJECT_STATUS
  CUSTOM
}

model Report {
  id             String    @id @default(uuid())
  name           String
  
  templateId     String
  template       ReportTemplate @relation(fields: [templateId], references: [id])
  
  parameters     Json
  status         ReportStatus @default(PENDING)
  
  filePath       String?
  fileType       String?
  
  createdAt      DateTime  @default(now())
  completedAt    DateTime?
  
  @@index([templateId])
  @@index([status])
}

enum ReportStatus {
  PENDING
  GENERATING
  COMPLETED
  FAILED
}

// ============================================
// Data Enhancement Models
// ============================================

model MergedVulnerability {
  id              String    @id @default(uuid())
  cveId           String
  primaryVulnId   String
  mergedVulnIds   String[]
  mergeReason     String
  
  createdAt       DateTime  @default(now())
  
  @@index([cveId])
}

model VulnerabilityImpact {
  id               String    @id @default(uuid())
  vulnerabilityId  String    @unique
  vulnerability    Vulnerability @relation(fields: [vulnerabilityId], references: [id], onDelete: Cascade)
  
  affectedProjects String[]
  affectedImages   String[]
  affectedServices String[]
  impactScore      Float
  
  calculatedAt     DateTime  @default(now())
  
  @@index([vulnerabilityId])
}

model MitreMapping {
  id              String    @id @default(uuid())
  vulnerabilityId String
  vulnerability   Vulnerability @relation(fields: [vulnerabilityId], references: [id], onDelete: Cascade)
  
  techniqueId     String
  techniqueName   String
  tacticId        String
  tacticName      String
  
  confidence      Float     @default(0.5)
  
  @@unique([vulnerabilityId, techniqueId])
  @@index([vulnerabilityId])
}

model VulnerabilityBookmark {
  id              String    @id @default(uuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  vulnerabilityId String
  vulnerability   Vulnerability @relation(fields: [vulnerabilityId], references: [id], onDelete: Cascade)
  
  note            String?
  createdAt       DateTime  @default(now())
  
  @@unique([userId, vulnerabilityId])
  @@index([userId])
  @@index([vulnerabilityId])
}

// ============================================
// Risk & Asset Models
// ============================================

model RiskScoreConfig {
  id               String    @id @default(uuid())
  organizationId   String    @unique
  organization     Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  exposureWeight   Float     @default(1.0)
  assetWeight      Float     @default(1.0)
  cvssWeight       Float     @default(1.0)
  exploitWeight    Float     @default(1.5)
  
  customFormula    String?
  
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}

model AssetCriticality {
  id               String    @id @default(uuid())
  projectId        String    @unique
  project          Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  criticalityLevel CriticalityLevel @default(MEDIUM)
  exposureLevel    ExposureLevel    @default(INTERNAL)
  
  tags             String[]
  notes            String?
  
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}

enum CriticalityLevel {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}

enum ExposureLevel {
  INTERNET
  DMZ
  INTERNAL
  ISOLATED
}

// ============================================
// Workflow Management Models
// ============================================

model VulnerabilityWorkflow {
  id                   String    @id @default(uuid())
  scanVulnerabilityId  String
  scanVulnerability    ScanVulnerability @relation(fields: [scanVulnerabilityId], references: [id], onDelete: Cascade)
  
  fromStatus           VulnStatus
  toStatus             VulnStatus
  changedById          String
  changedBy            User      @relation("WorkflowChangedBy", fields: [changedById], references: [id])
  
  comment              String?
  evidence             Json?
  
  createdAt            DateTime  @default(now())
  
  @@index([scanVulnerabilityId])
  @@index([changedById])
  @@index([createdAt])
}

model FixEvidence {
  id                   String    @id @default(uuid())
  scanVulnerabilityId  String
  scanVulnerability    ScanVulnerability @relation(fields: [scanVulnerabilityId], references: [id], onDelete: Cascade)
  
  evidenceType         EvidenceType
  url                  String?
  description          String?
  attachments          Json?
  
  previousValue        String?
  newValue             String?
  
  createdById          String
  createdBy            User      @relation("EvidenceCreatedBy", fields: [createdById], references: [id])
  createdAt            DateTime  @default(now())
  
  @@index([scanVulnerabilityId])
  @@index([evidenceType])
}

enum EvidenceType {
  PR_LINK
  COMMIT
  IMAGE_TAG_CHANGE
  PACKAGE_UPGRADE
  PATCH_APPLIED
  CONFIG_CHANGE
  WORKAROUND
  DOCUMENTATION
  OTHER
}

// ============================================
// DevOps Integration Models
// ============================================

model GitIntegration {
  id               String    @id @default(uuid())
  organizationId   String
  organization     Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  provider         GitProvider
  name             String
  isActive         Boolean   @default(true)
  
  baseUrl          String?
  apiToken         String
  
  defaultBranch    String    @default("main")
  autoPrGeneration Boolean   @default(false)
  
  repositories     GitRepository[]
  
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  
  @@index([organizationId])
}

enum GitProvider {
  GITHUB
  GITLAB
  BITBUCKET
  AZURE_DEVOPS
}

model GitRepository {
  id               String    @id @default(uuid())
  integrationId    String
  integration      GitIntegration @relation(fields: [integrationId], references: [id], onDelete: Cascade)
  
  projectId        String?
  project          Project?  @relation(fields: [projectId], references: [id])
  
  repoUrl          String
  repoOwner        String
  repoName         String
  defaultBranch    String    @default("main")
  
  createdAt        DateTime  @default(now())
  
  @@index([integrationId])
  @@index([projectId])
}

model IssueTrackerIntegration {
  id               String    @id @default(uuid())
  organizationId   String
  organization     Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  provider         IssueTrackerProvider
  name             String
  isActive         Boolean   @default(true)
  
  baseUrl          String
  apiToken         String
  projectKey       String?
  
  autoCreateIssues Boolean   @default(false)
  issueTemplate    Json?
  severityMapping  Json?
  
  linkedIssues     LinkedIssue[]
  
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  
  @@index([organizationId])
}

enum IssueTrackerProvider {
  JIRA
  LINEAR
  GITHUB_ISSUES
  GITLAB_ISSUES
  AZURE_DEVOPS
  ASANA
}

model LinkedIssue {
  id                    String    @id @default(uuid())
  integrationId         String
  integration           IssueTrackerIntegration @relation(fields: [integrationId], references: [id], onDelete: Cascade)
  
  scanVulnerabilityId   String
  scanVulnerability     ScanVulnerability @relation(fields: [scanVulnerabilityId], references: [id])
  
  externalId            String
  externalUrl           String
  status                String?
  
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  
  @@unique([integrationId, scanVulnerabilityId])
  @@index([scanVulnerabilityId])
}

// ============================================
// Authentication Extension Models
// ============================================

model EmailVerification {
  id        String   @id @default(uuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  @@index([token])
}

model UserMfa {
  id            String    @id @default(uuid())
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  secret        String
  isEnabled     Boolean   @default(false)
  backupCodes   String[]
  lastUsedAt    DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model UserSession {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  refreshToken String   @unique
  deviceInfo   Json?
  ipAddress    String?
  isActive     Boolean  @default(true)
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  lastActiveAt DateTime @default(now())
  
  @@index([userId])
  @@index([refreshToken])
}

model LoginHistory {
  id         String      @id @default(uuid())
  userId     String
  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  status     LoginStatus
  ipAddress  String?
  userAgent  String?
  location   Json?
  deviceId   String?
  failReason String?
  createdAt  DateTime    @default(now())
  
  @@index([userId, createdAt])
}

enum LoginStatus {
  SUCCESS
  FAILED_PASSWORD
  FAILED_MFA
  BLOCKED_IP
  ACCOUNT_LOCKED
}

model UserInvitation {
  id             String           @id @default(uuid())
  email          String
  organizationId String
  organization   Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  invitedById    String
  invitedBy      User             @relation("InvitedBy", fields: [invitedById], references: [id])
  role           Role             @default(DEVELOPER)
  token          String           @unique
  status         InvitationStatus @default(PENDING)
  expiresAt      DateTime
  createdAt      DateTime         @default(now())
  
  @@unique([email, organizationId])
  @@index([token])
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}

model SsoConfig {
  id             String       @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  provider       SsoProvider
  isEnabled      Boolean      @default(false)
  config         Json
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  
  @@unique([organizationId, provider])
}

enum SsoProvider {
  GOOGLE
  GITHUB
  MICROSOFT
  OKTA
  SAML
  OIDC
}

model IpWhitelist {
  id             String       @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  ipAddress      String
  description    String?
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  
  @@unique([organizationId, ipAddress])
}

model PasswordPolicy {
  id                 String       @id @default(uuid())
  organizationId     String       @unique
  organization       Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  minLength          Int          @default(8)
  requireUppercase   Boolean      @default(true)
  requireLowercase   Boolean      @default(true)
  requireNumbers     Boolean      @default(true)
  requireSpecial     Boolean      @default(false)
  maxAgeDays         Int?
  historyCount       Int          @default(5)
  lockoutThreshold   Int          @default(5)
  lockoutDurationMin Int          @default(30)
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt
}

model PasswordHistory {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  passwordHash String
  createdAt    DateTime @default(now())
  
  @@index([userId])
}

// ============================================
// System Settings Model
// ============================================

model SystemSettings {
  id        String   @id @default(uuid())
  key       String   @unique
  value     Json
  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())
  
  @@index([key])
}

// ============================================
// AI Execution History Model
// ============================================

model AiExecution {
  id            String   @id @default(uuid())
  
  userId        String?
  action        String
  actionLabel   String?
  
  provider      String?
  model         String?
  
  inputTokens   Int      @default(0)
  outputTokens  Int      @default(0)
  durationMs    Int      @default(0)
  
  status        AiExecutionStatus @default(SUCCESS)
  error         String?
  
  context       Json?
  result        String?
  
  createdAt     DateTime @default(now())
  
  @@index([userId])
  @@index([action])
  @@index([status])
  @@index([createdAt])
}

enum AiExecutionStatus {
  SUCCESS
  ERROR
  TIMEOUT
}`;
}
