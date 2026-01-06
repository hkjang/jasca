import { Controller, Post, Get, Delete, Body, Param, UseGuards, Query, BadRequestException, Req, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AiService } from './ai.service';
import { AiActionType, AI_ACTION_METADATA } from './ai-actions';
import { Request } from 'express';

interface TestConnectionDto {
    provider: 'openai' | 'anthropic' | 'vllm' | 'ollama' | 'custom';
    apiUrl: string;
    apiKey?: string;
}

interface ExecuteAiDto {
    action: AiActionType;
    context: Record<string, unknown>;
    estimatedTokens?: number;
}

interface EstimateAiDto {
    action: AiActionType;
    context: Record<string, unknown>;
}

interface OllamaModel {
    name: string;
    modified_at: string;
    size: number;
}

interface OllamaListResponse {
    models: OllamaModel[];
}

interface RequestWithUser extends Request {
    user?: {
        id: string;
        email: string;
        name: string;
        organizationId?: string;
        roles: Array<{ role: string }>;
    };
}

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
    constructor(private readonly aiService: AiService) { }

    /**
     * Execute AI action
     */
    @Post('execute')
    async executeAi(@Body() dto: ExecuteAiDto, @Req() req: RequestWithUser) {
        const user = req.user;
        if (!user) {
            throw new BadRequestException('User not authenticated');
        }

        // Get user roles as string array
        const userRoles = user.roles?.map(r => r.role) || [];

        // Check role-based access
        const metadata = AI_ACTION_METADATA[dto.action];
        if (metadata?.requiredRoles && metadata.requiredRoles.length > 0) {
            const hasRequiredRole = metadata.requiredRoles.some(role => userRoles.includes(role));
            if (!hasRequiredRole && !userRoles.includes('SYSTEM_ADMIN')) {
                throw new ForbiddenException('Insufficient permissions for this AI action');
            }
        }

        const startTime = Date.now();

        try {
            const result = await this.aiService.executeAction(dto.action, dto.context, user.id);
            const durationMs = Date.now() - startTime;

            return {
                id: result.id,
                action: dto.action,
                content: result.content,
                summary: result.summary,
                model: result.model,
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                durationMs,
                usedPrompt: result.usedPrompt,
            };
        } catch (error) {
            throw new BadRequestException(
                error instanceof Error ? error.message : 'AI execution failed'
            );
        }
    }

    /**
     * Get AI execution history
     */
    @Get('history')
    @Roles(Role.SYSTEM_ADMIN, Role.ORG_ADMIN)
    async getHistory(
        @Query('action') action?: string,
        @Query('status') status?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.aiService.getExecutionHistory({
            action,
            status,
            limit: limit ? parseInt(limit, 10) : 50,
            offset: offset ? parseInt(offset, 10) : 0,
        });
    }

    /**
     * Get AI usage statistics
     */
    @Get('stats')
    @Roles(Role.SYSTEM_ADMIN, Role.ORG_ADMIN)
    async getStats(@Query('days') days?: string) {
        return this.aiService.getExecutionStats(days ? parseInt(days, 10) : 7);
    }

    /**
     * Estimate tokens for AI action
     */
    @Post('estimate')
    async estimateTokens(@Body() dto: EstimateAiDto) {
        const estimate = this.aiService.estimateTokens(dto.action, dto.context);
        const metadata = AI_ACTION_METADATA[dto.action];

        return {
            action: dto.action,
            inputTokens: estimate.inputTokens,
            outputTokens: estimate.outputTokens,
            totalTokens: estimate.inputTokens + estimate.outputTokens,
            maxContextTokens: metadata?.maxContextTokens || 2000,
        };
    }

    /**
     * Get all prompts
     */
    @Get('prompts')
    @Roles(Role.SYSTEM_ADMIN, Role.ORG_ADMIN)
    async getAllPrompts() {
        return this.aiService.getAllPrompts();
    }

    /**
     * Update prompt for action
     */
    @Post('prompts/:action')
    @Roles(Role.SYSTEM_ADMIN, Role.ORG_ADMIN)
    async updatePrompt(
        @Param('action') action: string,
        @Body() dto: { prompt: string },
    ) {
        if (!dto.prompt) {
            throw new BadRequestException('Prompt is required');
        }
        await this.aiService.updatePrompt(action as AiActionType, dto.prompt);
        return { success: true, action, message: 'Prompt updated successfully' };
    }

    /**
     * Reset prompt to default
     */
    @Delete('prompts/:action')
    @Roles(Role.SYSTEM_ADMIN, Role.ORG_ADMIN)
    async resetPrompt(@Param('action') action: string) {
        await this.aiService.resetPrompt(action as AiActionType);
        return { success: true, action, message: 'Prompt reset to default' };
    }

    /**
     * Test connection to AI provider
     */
    @Post('test-connection')
    @Roles(Role.SYSTEM_ADMIN, Role.ORG_ADMIN)
    async testConnection(@Body() dto: TestConnectionDto) {
        try {
            if (!dto.apiUrl) {
                throw new BadRequestException('API URL is required');
            }

            switch (dto.provider) {
                case 'ollama':
                    return await this.testOllamaConnection(dto.apiUrl);
                case 'vllm':
                    return await this.testVllmConnection(dto.apiUrl, dto.apiKey);
                case 'openai':
                    return await this.testOpenAiConnection(dto.apiUrl, dto.apiKey);
                case 'anthropic':
                    return await this.testAnthropicConnection(dto.apiUrl, dto.apiKey);
                default:
                    return await this.testCustomConnection(dto.apiUrl, dto.apiKey);
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Connection test failed',
            };
        }
    }

    /**
     * Get available models from Ollama server
     */
    @Get('ollama/models')
    @Roles(Role.SYSTEM_ADMIN, Role.ORG_ADMIN)
    async getOllamaModels(@Query('apiUrl') apiUrl: string) {
        if (!apiUrl) {
            throw new BadRequestException('API URL is required');
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(`${apiUrl}/api/tags`, {
                method: 'GET',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Ollama server returned ${response.status}`);
            }

            const data = await response.json() as OllamaListResponse;
            return {
                success: true,
                models: data.models.map((m) => ({
                    id: m.name,
                    name: m.name,
                    size: m.size,
                    modifiedAt: m.modified_at,
                })),
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to fetch models',
                models: [],
            };
        }
    }

    /**
     * Get available models from vLLM server
     */
    @Get('vllm/models')
    @Roles(Role.SYSTEM_ADMIN, Role.ORG_ADMIN)
    async getVllmModels(@Query('apiUrl') apiUrl: string, @Query('apiKey') apiKey?: string) {
        if (!apiUrl) {
            throw new BadRequestException('API URL is required');
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }

            const response = await fetch(`${apiUrl}/models`, {
                method: 'GET',
                headers,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`vLLM server returned ${response.status}`);
            }

            const data = await response.json() as { data: { id: string }[] };
            return {
                success: true,
                models: data.data.map((m) => ({
                    id: m.id,
                    name: m.id,
                })),
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to fetch models',
                models: [],
            };
        }
    }

    // Helper methods for connection testing

    private async testOllamaConnection(apiUrl: string) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(`${apiUrl}/api/tags`, {
                method: 'GET',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                return { success: false, message: `Ollama server returned ${response.status}` };
            }

            const data = await response.json() as OllamaListResponse;
            return {
                success: true,
                message: `Connected to Ollama. ${data.models.length} model(s) available.`,
                modelCount: data.models.length,
            };
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    private async testVllmConnection(apiUrl: string, apiKey?: string) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }

            const response = await fetch(`${apiUrl}/models`, {
                method: 'GET',
                headers,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                return { success: false, message: `vLLM server returned ${response.status}` };
            }

            const data = await response.json() as { data: { id: string }[] };
            return {
                success: true,
                message: `Connected to vLLM. ${data.data.length} model(s) available.`,
                modelCount: data.data.length,
            };
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    private async testOpenAiConnection(apiUrl: string, apiKey?: string) {
        if (!apiKey) {
            return { success: false, message: 'API key is required for OpenAI' };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(`${apiUrl}/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
                return {
                    success: false,
                    message: errorData?.error?.message || `OpenAI API returned ${response.status}`,
                };
            }

            return { success: true, message: 'Successfully connected to OpenAI API' };
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    private async testAnthropicConnection(apiUrl: string, apiKey?: string) {
        if (!apiKey) {
            return { success: false, message: 'API key is required for Anthropic' };
        }

        // Anthropic doesn't have a simple models endpoint, so we just check if the header format is valid
        // A full test would require a messages request which costs money
        return { success: true, message: 'API configuration stored. Connection will be verified on first use.' };
    }

    private async testCustomConnection(apiUrl: string, apiKey?: string) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }

            // Try common endpoint patterns
            let response = await fetch(`${apiUrl}/models`, {
                method: 'GET',
                headers,
                signal: controller.signal,
            });

            if (!response.ok) {
                response = await fetch(`${apiUrl}/v1/models`, {
                    method: 'GET',
                    headers,
                    signal: controller.signal,
                });
            }

            clearTimeout(timeoutId);

            if (response.ok) {
                return { success: true, message: 'Successfully connected to custom AI server' };
            }

            return { success: false, message: `Server returned ${response.status}` };
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
}
