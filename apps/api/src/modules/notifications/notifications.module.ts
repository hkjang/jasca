import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationChannelsController } from './notification-channels.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [NotificationChannelsController],
    providers: [NotificationsService],
    exports: [NotificationsService],
})
export class NotificationsModule { }
