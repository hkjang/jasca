import { Module } from '@nestjs/common';
import { ExceptionsController } from './exceptions.controller';
import { ExceptionsService } from './exceptions.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ExceptionsController],
    providers: [ExceptionsService],
    exports: [ExceptionsService],
})
export class ExceptionsModule {}
