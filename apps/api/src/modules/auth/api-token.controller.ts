import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiTokenService, CreateApiTokenDto } from './services/api-token.service';

@Controller('api-tokens')
@UseGuards(JwtAuthGuard)
export class ApiTokenController {
    constructor(private readonly apiTokenService: ApiTokenService) { }

    @Post()
    async createToken(
        @CurrentUser() user: any,
        @Body() dto: CreateApiTokenDto,
    ) {
        const organizationId = user.organizationId;
        if (!organizationId) {
            return { error: 'User does not belong to an organization' };
        }
        return this.apiTokenService.createToken(organizationId, dto);
    }

    @Get()
    async listTokens(@CurrentUser() user: any) {
        const organizationId = user.organizationId;
        if (!organizationId) {
            return [];
        }
        return this.apiTokenService.listTokens(organizationId);
    }

    @Get(':id')
    async getToken(@CurrentUser() user: any, @Param('id') tokenId: string) {
        const organizationId = user.organizationId;
        if (!organizationId) {
            return { error: 'User does not belong to an organization' };
        }
        return this.apiTokenService.getToken(organizationId, tokenId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteToken(@CurrentUser() user: any, @Param('id') tokenId: string) {
        const organizationId = user.organizationId;
        if (!organizationId) {
            throw new Error('User does not belong to an organization');
        }
        await this.apiTokenService.deleteToken(organizationId, tokenId);
    }
}
