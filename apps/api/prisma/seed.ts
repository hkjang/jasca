import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create organization
    const org = await prisma.organization.upsert({
        where: { slug: 'acme-corp' },
        update: {},
        create: {
            name: 'Acme Corporation',
            slug: 'acme-corp',
            description: 'Main organization for testing',
        },
    });

    console.log('✅ Created organization:', org.name);

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@acme.com' },
        update: {},
        create: {
            email: 'admin@acme.com',
            name: 'Admin User',
            passwordHash: adminPassword,
            organizationId: org.id,
            roles: {
                create: [
                    { role: 'SYSTEM_ADMIN', scope: 'SYSTEM' },
                    { role: 'ORG_ADMIN', scope: 'ORGANIZATION', scopeId: org.id },
                ],
            },
        },
    });

    console.log('✅ Created admin user:', admin.email);

    // Create developer user
    const devPassword = await bcrypt.hash('dev123', 10);
    const dev = await prisma.user.upsert({
        where: { email: 'dev@acme.com' },
        update: {},
        create: {
            email: 'dev@acme.com',
            name: 'Developer User',
            passwordHash: devPassword,
            organizationId: org.id,
            roles: {
                create: [{ role: 'DEVELOPER', scope: 'ORGANIZATION', scopeId: org.id }],
            },
        },
    });

    console.log('✅ Created developer user:', dev.email);

    // Create security admin user
    const securityPassword = await bcrypt.hash('security123', 12);
    const securityAdmin = await prisma.user.upsert({
        where: { email: 'security@acme.com' },
        update: {},
        create: {
            email: 'security@acme.com',
            name: 'Security Admin',
            passwordHash: securityPassword,
            organizationId: org.id,
            emailVerifiedAt: new Date(),
            roles: {
                create: [{ role: 'SECURITY_ADMIN', scope: 'ORGANIZATION', scopeId: org.id }],
            },
        },
    });

    console.log('✅ Created security admin user:', securityAdmin.email);

    // Create viewer user
    const viewerPassword = await bcrypt.hash('viewer123', 12);
    const viewer = await prisma.user.upsert({
        where: { email: 'viewer@acme.com' },
        update: {},
        create: {
            email: 'viewer@acme.com',
            name: 'Viewer User',
            passwordHash: viewerPassword,
            organizationId: org.id,
            emailVerifiedAt: new Date(),
            roles: {
                create: [{ role: 'VIEWER', scope: 'ORGANIZATION', scopeId: org.id }],
            },
        },
    });

    console.log('✅ Created viewer user:', viewer.email);

    // Create password policy for organization
    await prisma.passwordPolicy.upsert({
        where: { organizationId: org.id },
        update: {},
        create: {
            organizationId: org.id,
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecial: false,
            maxAgeDays: 90,
            historyCount: 5,
            lockoutThreshold: 5,
            lockoutDurationMin: 30,
        },
    });

    console.log('✅ Created password policy for organization');

    // Create projects
    const projects = await Promise.all([
        prisma.project.upsert({
            where: { organizationId_slug: { organizationId: org.id, slug: 'backend-api' } },
            update: {},
            create: {
                name: 'Backend API',
                slug: 'backend-api',
                description: 'Main backend service',
                organizationId: org.id,
            },
        }),
        prisma.project.upsert({
            where: { organizationId_slug: { organizationId: org.id, slug: 'frontend-web' } },
            update: {},
            create: {
                name: 'Frontend Web',
                slug: 'frontend-web',
                description: 'Web application frontend',
                organizationId: org.id,
            },
        }),
        prisma.project.upsert({
            where: { organizationId_slug: { organizationId: org.id, slug: 'auth-service' } },
            update: {},
            create: {
                name: 'Auth Service',
                slug: 'auth-service',
                description: 'Authentication microservice',
                organizationId: org.id,
            },
        }),
    ]);

    console.log('✅ Created projects:', projects.map((p) => p.name).join(', '));

    // Create a default policy
    const policy = await prisma.policy.upsert({
        where: { id: 'default-block-critical' },
        update: {},
        create: {
            id: 'default-block-critical',
            name: 'Block Critical Vulnerabilities',
            description: 'Block deployment if critical vulnerabilities are found',
            isActive: true,
            organizationId: org.id,
            rules: {
                create: [
                    {
                        ruleType: 'SEVERITY_THRESHOLD',
                        conditions: { severity: ['CRITICAL'] },
                        action: 'BLOCK',
                        message: 'Critical vulnerabilities found. Deployment blocked.',
                        priority: 100,
                    },
                    {
                        ruleType: 'SEVERITY_THRESHOLD',
                        conditions: { severity: ['HIGH'] },
                        action: 'WARN',
                        message: 'High severity vulnerabilities found. Review before deployment.',
                        priority: 50,
                    },
                ],
            },
        },
    });

    console.log('✅ Created policy:', policy.name);

    // Create sample vulnerabilities
    const vulns = [
        {
            cveId: 'CVE-2024-1234',
            title: 'Remote Code Execution in Library X',
            severity: 'CRITICAL',
            cvssV3Score: 9.8,
        },
        {
            cveId: 'CVE-2024-5678',
            title: 'SQL Injection Vulnerability',
            severity: 'HIGH',
            cvssV3Score: 8.1,
        },
        {
            cveId: 'CVE-2024-9012',
            title: 'Cross-Site Scripting (XSS)',
            severity: 'MEDIUM',
            cvssV3Score: 6.5,
        },
        {
            cveId: 'CVE-2024-3456',
            title: 'Information Disclosure',
            severity: 'LOW',
            cvssV3Score: 3.7,
        },
    ];

    for (const vuln of vulns) {
        await prisma.vulnerability.upsert({
            where: { cveId: vuln.cveId },
            update: {},
            create: {
                cveId: vuln.cveId,
                title: vuln.title,
                description: `This is a sample vulnerability for testing purposes. ${vuln.title}`,
                severity: vuln.severity as any,
                cvssV3Score: vuln.cvssV3Score,
                references: ['https://nvd.nist.gov/vuln/detail/' + vuln.cveId],
            },
        });
    }

    console.log('✅ Created sample vulnerabilities');

    console.log('');
    console.log('🎉 Seeding completed!');
    console.log('');
    console.log('Test accounts:');
    console.log('  Admin: admin@acme.com / admin123');
    console.log('  Developer: dev@acme.com / dev123');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
