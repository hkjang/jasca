import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChannelType, NotificationEventType } from '@prisma/client';

interface NotificationPayload {
    eventType: NotificationEventType;
    title: string;
    message: string;
    severity?: string;
    projectId?: string;
    cveId?: string;
    link?: string;
}

// In-memory storage for user notifications (in production, you'd use a database table)
export interface UserNotification {
    id: string;
    userId: string;
    type: 'critical_vuln' | 'policy_violation' | 'exception' | 'scan_complete' | 'system';
    title: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
    link?: string;
}

const userNotifications: Map<string, UserNotification[]> = new Map();

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(private readonly prisma: PrismaService) { }

    // User notification methods
    async getUserNotifications(userId: string): Promise<UserNotification[]> {
        // In production, this would query from a database table
        // For now, we return mock notifications or empty array
        const notifications = userNotifications.get(userId) || [];

        // If no notifications exist for user, generate some mock ones for testing
        if (notifications.length === 0) {
            return [];
        }

        return notifications.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
    }

    async markAsRead(notificationId: string, userId: string): Promise<{ success: boolean }> {
        const notifications = userNotifications.get(userId) || [];
        const notification = notifications.find(n => n.id === notificationId);

        if (notification) {
            notification.isRead = true;
        }

        return { success: true };
    }

    async markAllAsRead(userId: string): Promise<{ success: boolean }> {
        const notifications = userNotifications.get(userId) || [];

        notifications.forEach(n => {
            n.isRead = true;
        });

        return { success: true };
    }

    // Creates a user notification (called internally when events happen)
    async createUserNotification(
        userId: string,
        type: UserNotification['type'],
        title: string,
        message: string,
        link?: string,
    ) {
        const notification: UserNotification = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            type,
            title,
            message,
            isRead: false,
            createdAt: new Date(),
            link,
        };

        const existing = userNotifications.get(userId) || [];
        existing.push(notification);
        userNotifications.set(userId, existing);

        return notification;
    }

    // External channel notification methods
    async notify(payload: NotificationPayload) {
        // Find applicable notification rules
        const rules = await this.prisma.notificationRule.findMany({
            where: {
                eventType: payload.eventType,
                isActive: true,
                channel: { isActive: true },
            },
            include: { channel: true },
        });

        for (const rule of rules) {
            // Check conditions
            if (rule.conditions) {
                const conditions = rule.conditions as any;

                if (conditions.severity && payload.severity) {
                    if (!conditions.severity.includes(payload.severity)) {
                        continue;
                    }
                }
            }

            // Send notification based on channel type
            await this.sendToChannel(rule.channel, payload);
        }
    }

    private async sendToChannel(
        channel: { id: string; type: ChannelType; config: any },
        payload: NotificationPayload,
    ) {
        const config = channel.config as any;

        try {
            switch (channel.type) {
                case 'SLACK':
                    await this.sendSlackNotification(config, payload);
                    break;
                case 'MATTERMOST':
                    await this.sendMattermostNotification(config, payload);
                    break;
                case 'EMAIL':
                    await this.sendEmailNotification(config, payload);
                    break;
                case 'WEBHOOK':
                    await this.sendWebhookNotification(config, payload);
                    break;
            }
        } catch (error) {
            this.logger.error(
                `Failed to send notification to channel ${channel.id}: ${error}`,
            );
        }
    }

    private async sendSlackNotification(config: any, payload: NotificationPayload) {
        if (!config.webhookUrl) return;

        const color = this.getSeverityColor(payload.severity);

        const slackPayload = {
            attachments: [
                {
                    color,
                    title: payload.title,
                    text: payload.message,
                    fields: [
                        payload.cveId && { title: 'CVE', value: payload.cveId, short: true },
                        payload.severity && { title: 'Severity', value: payload.severity, short: true },
                    ].filter(Boolean),
                    actions: payload.link
                        ? [{ type: 'button', text: 'View Details', url: payload.link }]
                        : undefined,
                },
            ],
        };

        await fetch(config.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(slackPayload),
        });
    }

    private async sendMattermostNotification(config: any, payload: NotificationPayload) {
        if (!config.webhookUrl) return;

        const mattermostPayload = {
            text: `**${payload.title}**\n${payload.message}`,
            props: {
                card: payload.link ? `[View Details](${payload.link})` : undefined,
            },
        };

        await fetch(config.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mattermostPayload),
        });
    }

    private async sendEmailNotification(config: any, payload: NotificationPayload) {
        // Email sending would require an email service integration
        // For now, just log the email that would be sent
        this.logger.log(
            `[EMAIL] To: ${config.recipients?.join(', ')} Subject: ${payload.title}`,
        );
    }

    private async sendWebhookNotification(config: any, payload: NotificationPayload) {
        if (!config.url) return;

        await fetch(config.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(config.headers || {}),
            },
            body: JSON.stringify(payload),
        });
    }

    private getSeverityColor(severity?: string): string {
        switch (severity?.toUpperCase()) {
            case 'CRITICAL':
                return '#d63031';
            case 'HIGH':
                return '#e17055';
            case 'MEDIUM':
                return '#fdcb6e';
            case 'LOW':
                return '#74b9ff';
            default:
                return '#636e72';
        }
    }
}

