import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

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
}

@ApiTags('Trivy DB')
@Controller('trivy-db')
export class TrivyDbController {
  private readonly dbPath: string;

  constructor() {
    // Resolve path relative to project root
    this.dbPath = path.resolve(process.cwd(), '..', 'trivy-db');
  }

  @Get('info')
  @ApiOperation({ summary: 'Get Trivy DB information and metadata' })
  @ApiResponse({ status: 200, description: 'Trivy DB info retrieved successfully' })
  async getDbInfo(): Promise<TrivyDbInfo> {
    const exists = fs.existsSync(this.dbPath);
    
    if (!exists) {
      return {
        exists: false,
        metadata: null,
        javaMetadata: null,
        files: [],
        totalSize: 0,
        location: this.dbPath,
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

    return {
      exists: true,
      metadata,
      javaMetadata,
      files,
      totalSize,
      location: this.dbPath,
    };
  }

  @Get('sync')
  @ApiOperation({ summary: 'Check if sync is needed by comparing with local cache' })
  @ApiResponse({ status: 200, description: 'Sync status retrieved' })
  async checkSyncStatus(): Promise<{ needsSync: boolean; reason: string }> {
    const localCachePath = path.join(
      process.env.LOCALAPPDATA || '',
      'trivy',
      'db',
      'metadata.json'
    );

    const projectMetadataPath = path.join(this.dbPath, 'metadata.json');

    if (!fs.existsSync(projectMetadataPath)) {
      return { needsSync: true, reason: 'Project DB not found' };
    }

    if (!fs.existsSync(localCachePath)) {
      return { needsSync: false, reason: 'Local cache not available' };
    }

    try {
      const projectMeta = JSON.parse(fs.readFileSync(projectMetadataPath, 'utf-8'));
      const localMeta = JSON.parse(fs.readFileSync(localCachePath, 'utf-8'));

      if (localMeta.Version > projectMeta.Version) {
        return { needsSync: true, reason: `Newer version available: ${localMeta.Version}` };
      }

      return { needsSync: false, reason: 'Project DB is up to date' };
    } catch (e) {
      return { needsSync: false, reason: 'Unable to compare versions' };
    }
  }
}
