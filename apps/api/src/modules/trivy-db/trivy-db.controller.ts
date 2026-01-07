import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Query,
  Logger,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import { SettingsService } from '../settings/settings.service';

const execAsync = promisify(exec);

// Trivy settings interface
interface TrivySettings {
  outputFormat: string;
  schemaVersion: number;
  severities: string[];
  ignoreUnfixed: boolean;
  timeout: string;
  cacheDir: string;
  scanners: string[];
}

interface TrivyDbMetadata {
  Version: number;
  NextUpdate: string;
  UpdatedAt: string;
  DownloadedAt: string;
}

interface TrivyDbInfo {
  exists: boolean;
  metadata: TrivyDbMetadata | null;
  javaMetadata: TrivyDbMetadata | null;
  files: {
    name: string;
    size: number;
    lastModified: string;
  }[];
  totalSize: number;
  location: string;
  trivyVersion: string | null;
  isHealthy: boolean;
}

interface VulnerabilityStats {
  sources: {
    name: string;
    count: number;
  }[];
  totalVulnerabilities: number;
  lastUpdated: string | null;
}

@ApiTags('Trivy DB')
@Controller('trivy-db')
export class TrivyDbController {
  private readonly dbPath: string;
  private readonly logger = new Logger(TrivyDbController.name);

  constructor(private readonly settingsService: SettingsService) {
    // Resolve path relative to project root (apps/api is two levels deep)
    this.dbPath = path.resolve(process.cwd(), '..', '..', 'trivy-db');
  }

  /**
   * Get Trivy settings from the settings service
   */
  private async getTrivySettings(): Promise<TrivySettings> {
    const defaultSettings: TrivySettings = {
      outputFormat: 'json',
      schemaVersion: 2,
      severities: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      ignoreUnfixed: false,
      timeout: '10m',
      cacheDir: '/tmp/trivy-cache',
      scanners: ['vuln', 'secret', 'config'],
    };

    try {
      const settings = await this.settingsService.get('trivy') as TrivySettings;
      if (settings) {
        return { ...defaultSettings, ...settings };
      }
    } catch (error) {
      this.logger.warn('Failed to load trivy settings, using defaults');
    }
    return defaultSettings;
  }

  /**
   * Build severity filter string from settings
   */
  private buildSeverityFilter(settings: TrivySettings): string {
    return settings.severities.join(',');
  }

  /**
   * Parse timeout string to milliseconds
   */
  private parseTimeoutMs(timeout: string): number {
    const match = timeout.match(/(\d+)(s|m|h)?/);
    if (!match) return 60000; // default 1 minute
    const value = parseInt(match[1], 10);
    const unit = match[2] || 's';
    switch (unit) {
      case 'h': return value * 3600000;
      case 'm': return value * 60000;
      default: return value * 1000;
    }
  }

  private getTrivyVersion(): string | null {
    try {
      const result = execSync('trivy --version', { encoding: 'utf-8' });
      const match = result.match(/Version:\s*(\S+)/);
      return match ? match[1] : result.split('\n')[0];
    } catch {
      return null;
    }
  }

  @Get('info')
  @ApiOperation({ summary: 'Get Trivy DB information and metadata' })
  @ApiResponse({ status: 200, description: 'Trivy DB info retrieved successfully' })
  async getDbInfo(): Promise<TrivyDbInfo> {
    const exists = fs.existsSync(this.dbPath);
    const trivyVersion = this.getTrivyVersion();

    if (!exists) {
      return {
        exists: false,
        metadata: null,
        javaMetadata: null,
        files: [],
        totalSize: 0,
        location: this.dbPath,
        trivyVersion,
        isHealthy: false,
      };
    }

    // Read metadata files
    let metadata: TrivyDbMetadata | null = null;
    let javaMetadata: TrivyDbMetadata | null = null;

    const metadataPath = path.join(this.dbPath, 'metadata.json');
    const javaMetadataPath = path.join(this.dbPath, 'java-metadata.json');

    if (fs.existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      } catch (e) {
        console.error('Failed to read metadata.json:', e);
      }
    }

    if (fs.existsSync(javaMetadataPath)) {
      try {
        javaMetadata = JSON.parse(fs.readFileSync(javaMetadataPath, 'utf-8'));
      } catch (e) {
        console.error('Failed to read java-metadata.json:', e);
      }
    }

    // Get file info
    const files: { name: string; size: number; lastModified: string }[] = [];
    let totalSize = 0;

    const fileNames = ['trivy.db', 'trivy-java.db', 'metadata.json', 'java-metadata.json'];

    for (const fileName of fileNames) {
      const filePath = path.join(this.dbPath, fileName);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        files.push({
          name: fileName,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
        });
        totalSize += stats.size;
      }
    }

    // Check if DB is healthy (has main db and metadata)
    const hasMainDb = files.some((f) => f.name === 'trivy.db');
    const hasMetadata = files.some((f) => f.name === 'metadata.json');
    const isHealthy = hasMainDb && hasMetadata;

    return {
      exists: true,
      metadata,
      javaMetadata,
      files,
      totalSize,
      location: this.dbPath,
      trivyVersion,
      isHealthy,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get vulnerability statistics from the database' })
  @ApiResponse({ status: 200, description: 'Vulnerability statistics retrieved' })
  async getStats(): Promise<VulnerabilityStats> {
    const sources = [
      { name: 'NVD (National Vulnerability Database)', count: 0 },
      { name: 'Red Hat Security', count: 0 },
      { name: 'Debian Security Tracker', count: 0 },
      { name: 'Ubuntu Security Notices', count: 0 },
      { name: 'Alpine SecDB', count: 0 },
      { name: 'Amazon Linux ALAS', count: 0 },
      { name: 'GitHub Advisory', count: 0 },
      { name: 'Go Vulnerability DB', count: 0 },
    ];

    const metadataPath = path.join(this.dbPath, 'metadata.json');
    let lastUpdated: string | null = null;

    if (fs.existsSync(metadataPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        lastUpdated = metadata.UpdatedAt;

        // Try to get stats using trivy CLI
        try {
          const result = await execAsync(
            `trivy --cache-dir "${this.dbPath}" version --format json`,
            { timeout: 10000 }
          );
          const versionInfo = JSON.parse(result.stdout);

          if (versionInfo.VulnerabilityDB) {
            // Update with actual data if available
          }
        } catch {
          // CLI not available or failed, use estimated counts based on DB size
          const dbPath = path.join(this.dbPath, 'trivy.db');
          if (fs.existsSync(dbPath)) {
            const stats = fs.statSync(dbPath);
            const dbSizeMB = stats.size / (1024 * 1024);
            // Rough estimation based on typical DB size
            const estimatedTotal = Math.round(dbSizeMB * 500);
            sources[0].count = Math.round(estimatedTotal * 0.35); // NVD ~35%
            sources[1].count = Math.round(estimatedTotal * 0.15); // Red Hat ~15%
            sources[2].count = Math.round(estimatedTotal * 0.12); // Debian ~12%
            sources[3].count = Math.round(estimatedTotal * 0.10); // Ubuntu ~10%
            sources[4].count = Math.round(estimatedTotal * 0.08); // Alpine ~8%
            sources[5].count = Math.round(estimatedTotal * 0.08); // Amazon ~8%
            sources[6].count = Math.round(estimatedTotal * 0.07); // GitHub ~7%
            sources[7].count = Math.round(estimatedTotal * 0.05); // Go ~5%
          }
        }
      } catch (e) {
        console.error('Failed to get stats:', e);
      }
    }

    const totalVulnerabilities = sources.reduce((sum, s) => sum + s.count, 0);

    return {
      sources,
      totalVulnerabilities,
      lastUpdated,
    };
  }

  @Get('sync')
  @ApiOperation({ summary: 'Check if sync is needed by comparing with local cache' })
  @ApiResponse({ status: 200, description: 'Sync status retrieved' })
  async checkSyncStatus(): Promise<{ needsSync: boolean; reason: string; localVersion?: number; projectVersion?: number }> {
    const localCachePath = path.join(
      process.env.LOCALAPPDATA || '',
      'trivy',
      'db',
      'metadata.json'
    );

    const projectMetadataPath = path.join(this.dbPath, 'metadata.json');
    let projectVersion: number | undefined;
    let localVersion: number | undefined;

    if (!fs.existsSync(projectMetadataPath)) {
      return { needsSync: true, reason: 'Project DB not found' };
    }

    try {
      const projectMeta = JSON.parse(fs.readFileSync(projectMetadataPath, 'utf-8'));
      projectVersion = projectMeta.Version;
    } catch {
      return { needsSync: false, reason: 'Unable to read project metadata' };
    }

    if (!fs.existsSync(localCachePath)) {
      return { needsSync: false, reason: 'Local cache not available (offline mode)', projectVersion };
    }

    try {
      const localMeta = JSON.parse(fs.readFileSync(localCachePath, 'utf-8'));
      localVersion = localMeta.Version;

      if (localVersion! > projectVersion!) {
        return {
          needsSync: true,
          reason: `Newer version available`,
          localVersion,
          projectVersion,
        };
      }

      return { needsSync: false, reason: 'Project DB is up to date', localVersion, projectVersion };
    } catch (e) {
      return { needsSync: false, reason: 'Unable to compare versions', projectVersion };
    }
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload Trivy DB files for offline deployment' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Files uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type' })
  @UseInterceptors(FilesInterceptor('files', 4))
  async uploadDbFiles(
    @UploadedFiles() files: Express.Multer.File[]
  ): Promise<{ success: boolean; uploaded: string[]; errors: string[]; message: string }> {
    const uploaded: string[] = [];
    const errors: string[] = [];

    if (!files || files.length === 0) {
      return {
        success: false,
        uploaded: [],
        errors: ['No files received'],
        message: '파일이 수신되지 않았습니다.',
      };
    }

    for (const file of files) {
      // diskStorage already saved the file, just track what was uploaded
      uploaded.push(file.originalname);
      console.log(`Uploaded: ${file.originalname} (${file.size} bytes) to ${file.path}`);
    }

    return {
      success: true,
      uploaded,
      errors,
      message: `${uploaded.length}개 파일 업로드 완료: ${uploaded.join(', ')}`,
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search vulnerabilities in the database' })
  @ApiQuery({ name: 'cve', required: false, description: 'CVE ID to search' })
  @ApiQuery({ name: 'package', required: false, description: 'Package name to search' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchVulnerabilities(
    @Query('cve') cveId?: string,
    @Query('package') packageName?: string
  ): Promise<{ results: any[]; query: { cve?: string; package?: string } }> {
    const results: any[] = [];

    if (!cveId && !packageName) {
      return { results: [], query: {} };
    }

    // Try to search using Trivy CLI if available
    if (cveId) {
      try {
        // Trivy doesn't have direct search, but we can provide info about the CVE format
        const cvePattern = /^CVE-\d{4}-\d+$/i;
        if (cvePattern.test(cveId)) {
          results.push({
            type: 'info',
            message: `To check if ${cveId} affects your system, run: trivy fs --severity CRITICAL,HIGH .`,
            cveId: cveId.toUpperCase(),
            links: [
              `https://nvd.nist.gov/vuln/detail/${cveId.toUpperCase()}`,
              `https://cve.mitre.org/cgi-bin/cvename.cgi?name=${cveId.toUpperCase()}`,
            ],
          });
        }
      } catch {
        // Ignore errors
      }
    }

    return {
      results,
      query: { cve: cveId, package: packageName },
    };
  }

  @Post('download-update')
  @ApiOperation({ summary: 'Trigger Trivy DB update from online sources' })
  @ApiResponse({ status: 200, description: 'Update initiated' })
  async triggerUpdate(): Promise<{ success: boolean; message: string }> {
    try {
      // Run trivy db download
      await execAsync('trivy image --download-db-only', { timeout: 300000 });

      // Copy from cache to project
      const cacheDbPath = path.join(process.env.LOCALAPPDATA || '', 'trivy', 'db', 'trivy.db');
      const cacheMetaPath = path.join(process.env.LOCALAPPDATA || '', 'trivy', 'db', 'metadata.json');

      if (!fs.existsSync(this.dbPath)) {
        fs.mkdirSync(this.dbPath, { recursive: true });
      }

      if (fs.existsSync(cacheDbPath)) {
        fs.copyFileSync(cacheDbPath, path.join(this.dbPath, 'trivy.db'));
      }
      if (fs.existsSync(cacheMetaPath)) {
        fs.copyFileSync(cacheMetaPath, path.join(this.dbPath, 'metadata.json'));
      }

      return { success: true, message: 'Database updated successfully' };
    } catch (e) {
      return { success: false, message: `Update failed: ${e.message}` };
    }
  }

  @Get('query/cve')
  @ApiOperation({ summary: 'Query vulnerability by CVE ID' })
  @ApiQuery({ name: 'id', required: true, description: 'CVE ID (e.g., CVE-2021-44228)' })
  @ApiResponse({ status: 200, description: 'CVE information retrieved' })
  async queryCve(
    @Query('id') cveId: string
  ): Promise<{ found: boolean; cveId: string; details: any; message: string }> {
    if (!cveId) {
      return { found: false, cveId: '', details: null, message: 'CVE ID required' };
    }

    const normalizedCve = cveId.toUpperCase().trim();
    const cvePattern = /^CVE-\d{4}-\d+$/;

    if (!cvePattern.test(normalizedCve)) {
      return { found: false, cveId: normalizedCve, details: null, message: 'Invalid CVE format' };
    }

    // Provide links to external CVE databases without calling Trivy CLI
    return {
      found: true,
      cveId: normalizedCve,
      details: {
        links: [
          `https://nvd.nist.gov/vuln/detail/${normalizedCve}`,
          `https://cve.mitre.org/cgi-bin/cvename.cgi?name=${normalizedCve}`,
          `https://www.cvedetails.com/cve/${normalizedCve}`,
          `https://security.snyk.io/vuln?search=${normalizedCve}`,
        ],
        scanCommand: `trivy fs --cache-dir "${this.dbPath}" --skip-db-update --severity CRITICAL,HIGH .`,
      },
      message: `CVE ${normalizedCve} 정보. 아래 링크에서 상세 정보를 확인하세요.`,
    };
  }

  @Get('query/package')
  @ApiOperation({ summary: 'Check vulnerabilities for a specific package' })
  @ApiQuery({ name: 'name', required: true, description: 'Package name' })
  @ApiQuery({ name: 'version', required: false, description: 'Package version' })
  @ApiResponse({ status: 200, description: 'Package vulnerability check result' })
  async queryPackage(
    @Query('name') packageName: string,
    @Query('version') version?: string
  ): Promise<{ packageName: string; version?: string; vulnerabilities: any[]; message: string }> {
    if (!packageName) {
      return { packageName: '', vulnerabilities: [], message: 'Package name required' };
    }

    try {
      // Create a temporary package.json to scan
      const tempDir = path.join(require('os').tmpdir(), `trivy-scan-${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });

      const packageJson = {
        name: 'temp-scan',
        version: '1.0.0',
        dependencies: {
          [packageName]: version || '*',
        },
      };

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      // Run trivy fs scan with skip-db-update to prevent downloading
      const result = await execAsync(
        `trivy fs --cache-dir "${this.dbPath}" --skip-db-update --format json "${tempDir}"`,
        { timeout: 30000 }
      );

      // Clean up
      fs.rmSync(tempDir, { recursive: true, force: true });

      const scanResult = JSON.parse(result.stdout);
      const vulnerabilities = scanResult.Results?.[0]?.Vulnerabilities || [];

      return {
        packageName,
        version,
        vulnerabilities: vulnerabilities.slice(0, 20), // Limit to 20 results
        message: vulnerabilities.length > 0
          ? `${vulnerabilities.length}개의 취약점 발견`
          : '취약점이 발견되지 않았습니다.',
      };
    } catch (error) {
      return {
        packageName,
        version,
        vulnerabilities: [],
        message: `스캔 실패: ${error.message}`,
      };
    }
  }

  @Get('query/recent')
  @ApiOperation({ summary: 'Get recent critical vulnerabilities' })
  @ApiQuery({ name: 'severity', required: false, description: 'Minimum severity (CRITICAL, HIGH, MEDIUM, LOW)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results (default: 10)' })
  @ApiResponse({ status: 200, description: 'Recent vulnerabilities list' })
  async getRecentVulnerabilities(
    @Query('severity') severity?: string,
    @Query('limit') limit?: string
  ): Promise<{ vulnerabilities: any[]; message: string }> {
    const settings = await this.getTrivySettings();
    const maxLimit = Math.min(parseInt(limit || '10', 10), 50);
    // Use provided severity or fall back to settings
    const severityFilter = severity ? severity.toUpperCase() : this.buildSeverityFilter(settings);
    const timeoutMs = this.parseTimeoutMs(settings.timeout);

    try {
      // Scan current project with skip-db-update to prevent downloading
      const ignoreUnfixedFlag = settings.ignoreUnfixed ? '--ignore-unfixed' : '';
      const result = await execAsync(
        `trivy fs --cache-dir "${this.dbPath}" --skip-db-update --format json --severity ${severityFilter} ${ignoreUnfixedFlag} --skip-dirs node_modules .`,
        { timeout: timeoutMs, cwd: path.resolve(this.dbPath, '..') }
      );

      const scanResult = JSON.parse(result.stdout);
      let allVulns: any[] = [];

      for (const target of scanResult.Results || []) {
        if (target.Vulnerabilities) {
          allVulns = allVulns.concat(target.Vulnerabilities.map((v: any) => ({
            ...v,
            target: target.Target,
            type: target.Type,
          })));
        }
      }

      // Sort by severity and limit
      const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, UNKNOWN: 4 };
      allVulns.sort((a, b) => (severityOrder[a.Severity] ?? 4) - (severityOrder[b.Severity] ?? 4));

      return {
        vulnerabilities: allVulns.slice(0, maxLimit),
        message: `${allVulns.length}개 취약점 중 상위 ${Math.min(allVulns.length, maxLimit)}개 표시`,
      };
    } catch (error) {
      return {
        vulnerabilities: [],
        message: `조회 실패: ${error.message}`,
      };
    }
  }

  @Get('test-config')
  @ApiOperation({ summary: 'Test Trivy configuration and validate settings' })
  @ApiResponse({ status: 200, description: 'Configuration test result' })
  async testConfig(): Promise<{
    success: boolean;
    settings: TrivySettings;
    trivyVersion: string | null;
    dbExists: boolean;
    dbHealthy: boolean;
    validations: { name: string; passed: boolean; message: string }[];
  }> {
    const settings = await this.getTrivySettings();
    const trivyVersion = this.getTrivyVersion();
    const dbInfo = await this.getDbInfo();

    const validations: { name: string; passed: boolean; message: string }[] = [];

    // 1. Check Trivy CLI availability
    validations.push({
      name: 'Trivy CLI',
      passed: !!trivyVersion,
      message: trivyVersion ? `버전 ${trivyVersion} 감지됨` : 'Trivy CLI가 설치되어 있지 않거나 PATH에 없습니다',
    });

    // 2. Check DB exists
    validations.push({
      name: 'Trivy DB',
      passed: dbInfo.exists,
      message: dbInfo.exists ? `DB 경로: ${dbInfo.location}` : 'Trivy DB가 존재하지 않습니다. 업로드가 필요합니다.',
    });

    // 3. Check DB is healthy
    validations.push({
      name: 'DB 상태',
      passed: dbInfo.isHealthy,
      message: dbInfo.isHealthy ? '메타데이터와 DB 파일이 모두 존재합니다' : '메타데이터 또는 DB 파일이 누락되었습니다',
    });

    // 4. Validate severities
    const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];
    const invalidSeverities = settings.severities.filter(s => !validSeverities.includes(s));
    validations.push({
      name: '심각도 설정',
      passed: invalidSeverities.length === 0 && settings.severities.length > 0,
      message: invalidSeverities.length === 0 
        ? `선택된 심각도: ${settings.severities.join(', ')}` 
        : `잘못된 심각도: ${invalidSeverities.join(', ')}`,
    });

    // 5. Validate timeout format
    const timeoutMatch = settings.timeout?.match(/^\d+(s|m|h)?$/);
    validations.push({
      name: '타임아웃 설정',
      passed: !!timeoutMatch,
      message: timeoutMatch ? `타임아웃: ${settings.timeout}` : `잘못된 타임아웃 형식: ${settings.timeout}`,
    });

    // 6. Validate scanners
    const validScanners = ['vuln', 'secret', 'config', 'license'];
    const invalidScanners = settings.scanners.filter(s => !validScanners.includes(s));
    validations.push({
      name: '스캐너 설정',
      passed: invalidScanners.length === 0 && settings.scanners.length > 0,
      message: invalidScanners.length === 0 
        ? `선택된 스캐너: ${settings.scanners.join(', ')}` 
        : `잘못된 스캐너: ${invalidScanners.join(', ')}`,
    });

    const allPassed = validations.every(v => v.passed);

    return {
      success: allPassed,
      settings,
      trivyVersion,
      dbExists: dbInfo.exists,
      dbHealthy: dbInfo.isHealthy,
      validations,
    };
  }
}
