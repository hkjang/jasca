import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChannelType, NotificationEventType } from '@prisma/client';
import * as nodemailer from 'nodemailer';

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

    // Test channel connection
    async testChannel(channelId: string): Promise<{ success: boolean; message: string }> {
        const channel = await this.prisma.notificationChannel.findUnique({
            where: { id: channelId },
        });

        if (!channel) {
            return { success: false, message: '채널을 찾을 수 없습니다.' };
        }

        const testPayload: NotificationPayload = {
            eventType: 'SCAN_COMPLETED' as NotificationEventType,
            title: '🔔 테스트 알림',
            message: 'JASCA 알림 채널 테스트입니다. 이 메시지가 수신되면 채널이 올바르게 설정되었습니다.',
            severity: 'INFO',
        };

        try {
            await this.sendToChannel(channel as any, testPayload);
            return { success: true, message: '테스트 알림이 성공적으로 발송되었습니다.' };
        } catch (error) {
            this.logger.error(`Test notification failed for channel ${channelId}:`, error);
            return { 
                success: false, 
                message: `알림 발송 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` 
            };
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
            this.logger.log(`Notification sent to channel ${channel.id} (${channel.type})`);
        } catch (error) {
            this.logger.error(
                `Failed to send notification to channel ${channel.id}: ${error}`,
            );
            throw error;
        }
    }

    private async sendSlackNotification(config: any, payload: NotificationPayload) {
        const webhookUrl = config.webhookUrl || config.url;
        if (!webhookUrl) {
            throw new Error('Slack webhook URL이 설정되지 않았습니다.');
        }

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
                    footer: 'JASCA Security Scanner',
                    ts: Math.floor(Date.now() / 1000),
                },
            ],
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(slackPayload),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Slack API error: ${response.status} - ${text}`);
        }
    }

    private async sendMattermostNotification(config: any, payload: NotificationPayload) {
        const webhookUrl = config.webhookUrl || config.url;
        if (!webhookUrl) {
            throw new Error('Mattermost webhook URL이 설정되지 않았습니다.');
        }

        const mattermostPayload = {
            text: `**${payload.title}**\n${payload.message}`,
            props: {
                card: payload.link ? `[View Details](${payload.link})` : undefined,
            },
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mattermostPayload),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Mattermost API error: ${response.status} - ${text}`);
        }
    }

    private async sendEmailNotification(config: any, payload: NotificationPayload) {
        const recipients = config.recipients;
        if (!recipients || recipients.length === 0) {
            throw new Error('이메일 수신자가 설정되지 않았습니다.');
        }

        // SMTP configuration - from channel config or environment variables
        const smtpConfig = {
            host: config.smtpHost || process.env.SMTP_HOST,
            port: parseInt(config.smtpPort || process.env.SMTP_PORT || '587', 10),
            secure: config.smtpSecure || process.env.SMTP_SECURE === 'true',
            auth: (config.smtpUser || process.env.SMTP_USER) ? {
                user: config.smtpUser || process.env.SMTP_USER,
                pass: config.smtpPass || process.env.SMTP_PASS,
            } : undefined,
        };

        if (!smtpConfig.host) {
            throw new Error('SMTP 호스트가 설정되지 않았습니다. 환경 변수 또는 채널 설정을 확인하세요.');
        }

        const transporter = nodemailer.createTransport(smtpConfig);

        // Verify connection
        await transporter.verify();

        const fromAddress = config.fromAddress || process.env.SMTP_FROM || 'noreply@jasca.local';

        await transporter.sendMail({
            from: fromAddress,
            to: recipients.join(', '),
            subject: `[JASCA] ${payload.title}`,
            html: this.buildEmailHtml(payload),
            text: `${payload.title}\n\n${payload.message}`,
        });

        this.logger.log(`Email sent to: ${recipients.join(', ')}`);
    }

    private buildEmailHtml(payload: NotificationPayload): string {
        const severityColor = this.getSeverityColor(payload.severity);
        
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 24px; }
        .header h1 { margin: 0; font-size: 24px; }
        .severity-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-top: 8px; background: ${severityColor}; color: white; }
        .content { padding: 24px; }
        .content h2 { margin: 0 0 16px 0; color: #1f2937; font-size: 18px; }
        .content p { margin: 0 0 16px 0; color: #4b5563; line-height: 1.6; }
        .info-box { background: #f8fafc; border-radius: 4px; padding: 16px; margin: 16px 0; }
        .info-item { display: flex; margin-bottom: 8px; }
        .info-label { font-weight: 600; color: #374151; width: 100px; }
        .info-value { color: #6b7280; }
        .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 16px; }
        .footer { background: #f8fafc; padding: 16px 24px; text-align: center; color: #9ca3af; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 JASCA Security Alert</h1>
            ${payload.severity ? `<span class="severity-badge">${payload.severity}</span>` : ''}
        </div>
        <div class="content">
            <h2>${payload.title}</h2>
            <p>${payload.message}</p>
            
            ${(payload.cveId || payload.projectId) ? `
            <div class="info-box">
                ${payload.cveId ? `<div class="info-item"><span class="info-label">CVE ID</span><span class="info-value">${payload.cveId}</span></div>` : ''}
                ${payload.projectId ? `<div class="info-item"><span class="info-label">Project</span><span class="info-value">${payload.projectId}</span></div>` : ''}
            </div>
            ` : ''}
            
            ${payload.link ? `<a href="${payload.link}" class="button">상세 보기</a>` : ''}
        </div>
        <div class="footer">
            This notification was sent by JASCA Security Scanner.
        </div>
    </div>
</body>
</html>
        `.trim();
    }

    private async sendWebhookNotification(config: any, payload: NotificationPayload) {
        const webhookUrl = config.webhookUrl || config.url;
        if (!webhookUrl) {
            throw new Error('Webhook URL이 설정되지 않았습니다.');
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(config.headers || {}),
            },
            body: JSON.stringify({
                ...payload,
                timestamp: new Date().toISOString(),
                source: 'JASCA',
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Webhook error: ${response.status} - ${text}`);
        }
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
