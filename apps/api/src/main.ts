import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { json, urlencoded } from 'express';

function validateEnvironment() {
    const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
    const missing: string[] = [];

    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            missing.push(envVar);
        }
    }

    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach((v) => console.error(`   - ${v}`));
        console.error('\nPlease set these environment variables before starting the server.');
        console.error('For offline deployment, ensure .env file is properly configured.');
        process.exit(1);
    }

    console.log('✅ Environment variables validated');
}

async function bootstrap() {
    // Validate environment variables first
    validateEnvironment();

    const app = await NestFactory.create(AppModule, {
        bodyParser: false, // Disable default body-parser to apply custom limit
    });

    // Increase body size limit for AI requests
    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ limit: '50mb', extended: true }));

    // Global prefix
    app.setGlobalPrefix('api');

    // Validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }),
    );
    // Global Exception Filter
    app.useGlobalFilters(new AllExceptionsFilter());

    // CORS
    app.enableCors({
        origin: true, // Allow all origins for offline usage
        credentials: true,
    });

    // Swagger documentation
    const config = new DocumentBuilder()
        .setTitle('JASCA API')
        .setDescription('Trivy Vulnerability Management System API')
        .setVersion('1.0')
        .addBearerAuth()
        .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT || 3001;
    await app.listen(port);

    console.log(`🚀 JASCA API running on http://localhost:${port}`);
    console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
