/**
 * Script to reset AI prompts in database to defaults
 * This deletes the 'ai_prompts' key from systemSettings
 */

const { PrismaClient } = require('@prisma/client');

async function resetAiPrompts() {
    const prisma = new PrismaClient();
    
    try {
        console.log('🔄 Resetting AI prompts to defaults...');
        
        // Check if custom prompts exist
        const settings = await prisma.systemSettings.findUnique({
            where: { key: 'ai_prompts' }
        });
        
        if (settings) {
            console.log('📋 Found custom prompts, deleting...');
            await prisma.systemSettings.delete({
                where: { key: 'ai_prompts' }
            });
            console.log('✅ Custom AI prompts deleted successfully!');
            console.log('   Now using default prompts from ai-actions.ts');
        } else {
            console.log('ℹ️ No custom prompts found in database.');
            console.log('   Already using default prompts from ai-actions.ts');
        }
    } catch (error) {
        console.error('❌ Error resetting prompts:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

resetAiPrompts();
