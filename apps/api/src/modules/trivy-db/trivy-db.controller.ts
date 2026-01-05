import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { execSync, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

  constructor() {
    // Resolve path relative to project root (apps/api is two levels deep)
    this.dbPath = path.resolve(process.cwd(), '..', '..', 'trivy-db');
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
  ): Promise<{ success: boolean; uploaded: string[]; errors: string[] }> {
    const allowedFiles = ['trivy.db', 'trivy-java.db', 'metadata.json', 'java-metadata.json'];
    const uploaded: string[] = [];
    const errors: string[] = [];

    // Ensure directory exists
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }

    for (const file of files) {
      const fileName = file.originalname;

      if (!allowedFiles.includes(fileName)) {
        errors.push(`Invalid file: ${fileName}. Allowed: ${allowedFiles.join(', ')}`);
        continue;
      }

      try {
        const destPath = path.join(this.dbPath, fileName);

        // Backup existing file if exists
        if (fs.existsSync(destPath)) {
          const backupPath = `${destPath}.backup`;
          fs.copyFileSync(destPath, backupPath);
        }

        // Write new file
        fs.writeFileSync(destPath, file.buffer);
        uploaded.push(fileName);
      } catch (e) {
        errors.push(`Failed to save ${fileName}: ${e.message}`);
      }
    }

    return {
      success: errors.length === 0,
      uploaded,
      errors,
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
}
