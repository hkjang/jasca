import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { DatabaseController } from './database.controller';
import { DatabaseService } from './database.service';

@Module({
    imports: [PrismaModule, AuditModule],
    controllers: [DatabaseController],
    providers: [DatabaseService],
    exports: [DatabaseService],
})
export class DatabaseModule {}
