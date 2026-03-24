import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthContextService } from './auth-context.service';
import { AccessContextKind } from './contracts/auth-context.contract';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AuthUserProvisioningService } from './auth-user-provisioning.service';
import { RegisterUserDto } from './dto/register-user.dto';

interface SelectContextInput {
    context: AccessContextKind;
}

interface SyncUserInput {
    tenantId?: string;
    tenantSubdomain?: string;
}

interface AuthRequest {
    user?: Record<string, unknown>;
    headers?: Record<string, string | string[] | undefined>;
}

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authContextService: AuthContextService,
        private readonly authUserProvisioningService: AuthUserProvisioningService,
    ) { }

    @ApiOperation({ summary: 'Return identity + available access contexts for the logged-in user' })
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions('auth-context:read')
    @Get('context')
    async getContext(@Req() req: AuthRequest) {
        const tenantIdHeader = this.getHeaderValue(req, 'x-tenant-id');
        const tenantSubdomainHeader = this.getHeaderValue(req, 'x-tenant-subdomain');

        const provisioning = await this.authUserProvisioningService.syncAuthenticatedUser(req.user, {
            tenantId: tenantIdHeader,
            tenantSubdomain: tenantSubdomainHeader,
        });

        return {
            ...this.authContextService.build(req.user),
            provisioning,
        };
    }

    @ApiOperation({ summary: 'Select active access context (contract endpoint, persistence to be implemented)' })
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions('auth-context:write')
    @Post('context/select')
    selectContext(@Body() body: SelectContextInput) {
        return {
            selectedContext: body.context,
            persisted: false,
            message: 'Context selection contract accepted. Persistence will be implemented in onboarding/session phase.',
        };
    }

    @ApiOperation({ summary: 'Create or update local user profile for authenticated Auth0 user' })
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions('auth-context:write')
    @Post('sync-user')
    syncUser(@Req() req: AuthRequest, @Body() body: SyncUserInput) {
        const tenantIdHeader = this.getHeaderValue(req, 'x-tenant-id');
        const tenantSubdomainHeader = this.getHeaderValue(req, 'x-tenant-subdomain');

        return this.authUserProvisioningService.syncAuthenticatedUser(req.user, {
            tenantId: body.tenantId ?? tenantIdHeader,
            tenantSubdomain: body.tenantSubdomain ?? tenantSubdomainHeader,
        });
    }

    @ApiOperation({ summary: 'Explicit user registration flow from form (professional/adminOrg)' })
    @UseGuards(AuthGuard('jwt'))
    @Post('register')
    register(@Req() req: AuthRequest, @Body() body: RegisterUserDto) {
        return this.authUserProvisioningService.registerAuthenticatedUser(req.user, body);
    }

    @ApiOperation({ summary: 'Return whether the authenticated user already has an internal profile' })
    @UseGuards(AuthGuard('jwt'))
    @Get('registration-status')
    registrationStatus(@Req() req: AuthRequest) {
        return this.authUserProvisioningService.getRegistrationStatus(req.user);
    }

    private getHeaderValue(req: AuthRequest, key: string): string | undefined {
        const value = req.headers?.[key];

        if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed.length > 0 ? trimmed : undefined;
        }

        if (Array.isArray(value)) {
            const first = value.find((item) => typeof item === 'string' && item.trim().length > 0);
            return first?.trim();
        }

        return undefined;
    }
}
