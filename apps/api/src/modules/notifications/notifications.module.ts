import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationChannelsController } from './notification-channels.controller';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [NotificationChannelsController, NotificationsController],
    providers: [NotificationsService],
    exports: [NotificationsService],
})
export class NotificationsModule { }

