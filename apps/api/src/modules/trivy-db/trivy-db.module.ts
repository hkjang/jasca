import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { TrivyDbController } from './trivy-db.controller';
import { SettingsModule } from '../settings/settings.module';

// Trivy DB path
const trivyDbPath = path.resolve(process.cwd(), '..', '..', 'trivy-db');

@Module({
  imports: [
    SettingsModule,
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          // Ensure directory exists
          if (!fs.existsSync(trivyDbPath)) {
            fs.mkdirSync(trivyDbPath, { recursive: true });
          }
          cb(null, trivyDbPath);
        },
        filename: (req, file, cb) => {
          // Use original filename
          cb(null, file.originalname);
        },
      }),
      limits: {
        fileSize: 2 * 1024 * 1024 * 1024, // 2GB limit for trivy.db
      },
      fileFilter: (req, file, cb) => {
        const allowedFiles = ['trivy.db', 'trivy-java.db', 'metadata.json', 'java-metadata.json'];
        if (allowedFiles.includes(file.originalname)) {
          cb(null, true);
        } else {
          cb(new Error(`Invalid file: ${file.originalname}. Allowed: ${allowedFiles.join(', ')}`), false);
        }
      },
    }),
  ],
  controllers: [TrivyDbController],
})
export class TrivyDbModule {}
