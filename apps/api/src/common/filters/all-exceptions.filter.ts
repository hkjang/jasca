import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: any = 'Internal server error';
        let errorCode: string | undefined;

        // Handle different exception types
        if (exception instanceof HttpException) {
            status = exception.getStatus();
            message = exception.getResponse();
        } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
            // Prisma known errors
            status = HttpStatus.BAD_REQUEST;
            errorCode = exception.code;
            message = this.getPrismaErrorMessage(exception);
            this.logger.error(
                `Prisma Error [${exception.code}]: ${exception.message}`,
                exception.stack,
            );
        } else if (exception instanceof Prisma.PrismaClientInitializationError) {
            // Database connection error
            status = HttpStatus.SERVICE_UNAVAILABLE;
            message = 'Database connection failed. Please check database configuration.';
            this.logger.error(
                `Database Connection Error: ${exception.message}`,
                exception.stack,
            );
        } else if (exception instanceof Prisma.PrismaClientValidationError) {
            status = HttpStatus.BAD_REQUEST;
            message = 'Invalid data provided';
            this.logger.error(
                `Prisma Validation Error: ${exception.message}`,
                exception.stack,
            );
        }

        // Enhanced Logging for 500 errors
        if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(
                `Status: ${status} Error: ${JSON.stringify(message)} Path: ${request.url}`,
                exception instanceof Error ? exception.stack : '',
            );
            // Log additional context for debugging
            if (exception instanceof Error) {
                this.logger.error(`Error Name: ${exception.name}`);
                this.logger.error(`Error Message: ${exception.message}`);
            }
        } else if (status >= 400) {
            this.logger.warn(
                `Status: ${status} Error: ${JSON.stringify(message)} Path: ${request.url}`,
            );
        }

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: typeof message === 'string' ? message : (message as any).message || message,
            ...(errorCode && { errorCode }),
        });
    }

    private getPrismaErrorMessage(error: Prisma.PrismaClientKnownRequestError): string {
        switch (error.code) {
            case 'P2002':
                return 'A record with this value already exists';
            case 'P2025':
                return 'Record not found';
            case 'P2003':
                return 'Foreign key constraint failed';
            case 'P2014':
                return 'Required relation not found';
            default:
                return `Database error: ${error.code}`;
        }
    }
}
