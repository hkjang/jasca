const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tokens = await prisma.apiToken.findMany({
        select: {
            id: true,
            name: true,
            tokenPrefix: true,
            permissions: true,
            organizationId: true,
        }
    });
    console.log(JSON.stringify(tokens, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
