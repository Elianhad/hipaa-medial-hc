import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
    constructor(private readonly tenantsService: TenantsService) { }

    /**
     * Public endpoint — resolves a subdomain to its tenant profile.
     * Used by the frontend public booking pages (/booking/[slug], /org/[slug]).
     * No auth required so the page loads for unauthenticated patients.
     */
    @ApiOperation({ summary: 'Resolve tenant by subdomain (public)' })
    @Get('by-subdomain/:subdomain')
    findBySubdomain(@Param('subdomain') subdomain: string) {
        return this.tenantsService.findBySubdomain(subdomain);
    }

    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @ApiOperation({ summary: 'Get tenant by ID' })
    @Permissions('tenants:read')
    @Get(':id')
    findById(@Param('id') id: string) {
        return this.tenantsService.findById(id);
    }

    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @ApiOperation({ summary: 'Create a new tenant' })
    @Permissions('tenants:write')
    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() dto: CreateTenantDto) {
        return this.tenantsService.create(dto);
    }

    /** Return high-level metrics (summary) for an organization tenant. */
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @ApiOperation({ summary: 'Get organization summary metrics' })
    @Permissions('tenants:read')
    @Get(':id/summary')
    getOrgSummary(@Param('id') id: string) {
        return this.tenantsService.getOrgSummary(id);
    }

    /** Return staff list with professional details for an organization. */
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @ApiOperation({ summary: 'Get organization staff with professional details' })
    @Permissions('tenants:read')
    @Get(':id/staff')
    getOrgStaff(@Param('id') id: string) {
        return this.tenantsService.getOrgStaffDetail(id);
    }

    /** List all active members of an organization tenant. */
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @ApiOperation({ summary: 'List organization members' })
    @Permissions('tenants:read')
    @Get(':id/members')
    findMembers(@Param('id') id: string) {
        return this.tenantsService.findMembers(id);
    }

    /** Add a professional to an organization as staff or admin. */
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @ApiOperation({ summary: 'Add member to organization tenant' })
    @Permissions('tenants:write')
    @Post(':id/members')
    @HttpCode(HttpStatus.CREATED)
    addMember(@Param('id') id: string, @Body() dto: AddMemberDto) {
        return this.tenantsService.addMember(id, dto.userId, dto.role);
    }
}
