import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    ParseUUIDPipe,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ChronicCareService } from './chronic-care.service';
import { UpsertBaselineDto } from './dto/upsert-baseline.dto';
import { CreateFastTrackEvolutionDto } from './dto/create-fast-track-evolution.dto';
import {
    CreatePrescriptionDto,
    OneClickRefillDto,
    ProlongedPrescriptionPlanDto,
    SignPrescriptionDto,
    SignEvolutionDto,
    SignProblemThreadDto,
} from './dto/prescription.dto';
import { PromoteProblemDto, DiscardProblemDto } from './dto/problem-transition.dto';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums/user-role.enum';
import { PrescriptionStatus } from './entities/prescription.entity';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('chronic-care')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
@Controller('chronic-care')
export class ChronicCareController {
    constructor(private readonly service: ChronicCareService) { }

    // ─── Baseline ────────────────────────────────────────────────

    @ApiOperation({ summary: 'Create or update the baseline for a chronic problem' })
    @Roles(UserRole.TenantProf, UserRole.TenantOrg, UserRole.SuperAdmin)
    @Permissions('chronic-care:write')
    @Post('baselines')
    upsertBaseline(
        @TenantId() tenantId: string,
        @CurrentUser() user: { sub: string; resolvedUserId?: string },
        @Body() dto: UpsertBaselineDto,
    ) {
        return this.service.upsertBaseline(tenantId, user.resolvedUserId ?? user.sub, dto);
    }

    @ApiOperation({ summary: 'Get baseline for a problem' })
    @Permissions('chronic-care:read')
    @Get('baselines/:problemId')
    getBaseline(
        @TenantId() tenantId: string,
        @Param('problemId', ParseUUIDPipe) problemId: string,
    ) {
        return this.service.getBaseline(tenantId, problemId);
    }

    // ─── Fast-Track Evolution ────────────────────────────────────

    @ApiOperation({ summary: 'Create a fast-track / routine-control evolution' })
    @Roles(UserRole.TenantProf, UserRole.TenantOrg, UserRole.SuperAdmin)
    @Permissions('chronic-care:write')
    @Post('evolutions/fast-track')
    createFastTrackEvolution(
        @TenantId() tenantId: string,
        @Body() dto: CreateFastTrackEvolutionDto,
    ) {
        return this.service.createFastTrackEvolution(tenantId, dto);
    }

    // ─── Trend History (Flowsheet) ───────────────────────────────

    @ApiOperation({ summary: 'Get trend history for charting (Flowsheet)' })
    @ApiQuery({ name: 'days', required: false, type: Number, description: 'Lookback window in days (default 180)' })
    @Permissions('chronic-care:read')
    @Get('problems/:problemId/trend')
    getTrendHistory(
        @TenantId() tenantId: string,
        @Param('problemId', ParseUUIDPipe) problemId: string,
        @Query('days') days = '180',
    ) {
        return this.service.getTrendHistory(tenantId, problemId, +days);
    }

    @ApiOperation({ summary: 'Promote/refactor problem (rename + reclassify) keeping same ID and history' })
    @Roles(UserRole.TenantProf, UserRole.TenantOrg, UserRole.SuperAdmin)
    @Permissions('chronic-care:write')
    @Patch('problems/:problemId/promote')
    promoteProblem(
        @TenantId() tenantId: string,
        @CurrentUser() user: { sub: string; resolvedUserId?: string },
        @Param('problemId', ParseUUIDPipe) problemId: string,
        @Body() dto: PromoteProblemDto,
    ) {
        return this.service.promoteProblem(
            tenantId,
            user.resolvedUserId ?? user.sub,
            problemId,
            dto,
        );
    }

    @ApiOperation({ summary: 'Discard suspected diagnosis and close problem thread' })
    @Roles(UserRole.TenantProf, UserRole.TenantOrg, UserRole.SuperAdmin)
    @Permissions('chronic-care:write')
    @Patch('problems/:problemId/discard')
    discardProblem(
        @TenantId() tenantId: string,
        @CurrentUser() user: { sub: string; resolvedUserId?: string },
        @Param('problemId', ParseUUIDPipe) problemId: string,
        @Body() dto: DiscardProblemDto,
    ) {
        return this.service.discardProblem(
            tenantId,
            user.resolvedUserId ?? user.sub,
            problemId,
            dto,
        );
    }

    @ApiOperation({ summary: 'List transition events for a problem' })
    @Permissions('chronic-care:read')
    @Get('problems/:problemId/transitions')
    getProblemTransitions(
        @TenantId() tenantId: string,
        @Param('problemId', ParseUUIDPipe) problemId: string,
    ) {
        return this.service.getProblemTransitions(tenantId, problemId);
    }

    // ─── Decompensation ──────────────────────────────────────────

    @ApiOperation({ summary: 'Update decompensation status of a problem' })
    @Roles(UserRole.TenantProf, UserRole.TenantOrg, UserRole.SuperAdmin)
    @Permissions('chronic-care:write')
    @Patch('problems/:problemId/decompensation')
    markDecompensation(
        @TenantId() tenantId: string,
        @Param('problemId', ParseUUIDPipe) problemId: string,
        @Body('status') status: 'acute_exacerbation' | 'hospitalized' | 'resolved_decompensation' | 'none',
    ) {
        return this.service.markDecompensation(tenantId, problemId, status);
    }

    // ─── Prescriptions ───────────────────────────────────────────

    @ApiOperation({ summary: 'Create a prescription linked to a problem' })
    @Roles(UserRole.TenantProf, UserRole.TenantOrg, UserRole.SuperAdmin)
    @Permissions('chronic-care:write')
    @Post('prescriptions')
    createPrescription(
        @TenantId() tenantId: string,
        @Body() dto: CreatePrescriptionDto,
    ) {
        return this.service.createPrescription(tenantId, dto);
    }

    @ApiOperation({ summary: 'Search AR vademecum (DCI mandatory, brand optional)' })
    @ApiQuery({ name: 'q', required: true, description: 'DCI or brand search term' })
    @Permissions('chronic-care:read')
    @Get('vademecum/search')
    searchVademecum(@Query('q') q: string) {
        return this.service.searchVademecum(q);
    }

    @ApiOperation({ summary: 'One-click refill — renew all baseline meds' })
    @Roles(UserRole.TenantProf, UserRole.TenantOrg, UserRole.SuperAdmin)
    @Permissions('chronic-care:write')
    @Post('prescriptions/one-click-refill')
    oneClickRefill(
        @TenantId() tenantId: string,
        @Body() dto: OneClickRefillDto,
    ) {
        return this.service.oneClickRefill(tenantId, dto);
    }

    @ApiOperation({ summary: 'Generate prolonged monthly prescription plan for chronic problem' })
    @Roles(UserRole.TenantProf, UserRole.TenantOrg, UserRole.SuperAdmin)
    @Permissions('chronic-care:write')
    @Post('prescriptions/prolonged-plan')
    createProlongedPlan(
        @TenantId() tenantId: string,
        @Body() dto: ProlongedPrescriptionPlanDto,
    ) {
        return this.service.createProlongedPrescriptionPlan(tenantId, dto);
    }

    @ApiOperation({ summary: 'Digitally sign a prescription and generate digital document (JSON/PDF)' })
    @Roles(UserRole.TenantProf, UserRole.TenantOrg, UserRole.SuperAdmin)
    @Permissions('chronic-care:write')
    @Post('prescriptions/:id/sign')
    signPrescription(
        @TenantId() tenantId: string,
        @CurrentUser() user: { sub: string; resolvedUserId?: string },
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: SignPrescriptionDto,
    ) {
        return this.service.signPrescription(tenantId, id, user.resolvedUserId ?? user.sub, dto);
    }

    @ApiOperation({ summary: 'Get digital prescription document (JSON/PDF)' })
    @ApiQuery({ name: 'format', required: false, enum: ['json', 'pdf'] })
    @ApiQuery({ name: 'validationBaseUrl', required: false, type: String })
    @Permissions('chronic-care:read')
    @Get('prescriptions/:id/document')
    getPrescriptionDocument(
        @TenantId() tenantId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Query('format') format: 'json' | 'pdf' = 'json',
        @Query('validationBaseUrl') validationBaseUrl?: string,
    ) {
        return this.service.generateDigitalPrescriptionDocument(tenantId, id, format, validationBaseUrl);
    }

    @ApiOperation({ summary: 'Sign clinical evolution note' })
    @Roles(UserRole.TenantProf, UserRole.TenantOrg, UserRole.SuperAdmin)
    @Permissions('chronic-care:write')
    @Post('evolutions/:id/sign')
    signEvolution(
        @TenantId() tenantId: string,
        @CurrentUser() user: { sub: string; resolvedUserId?: string },
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: SignEvolutionDto,
    ) {
        return this.service.signEvolution(tenantId, id, user.resolvedUserId ?? user.sub, dto);
    }

    @ApiOperation({ summary: 'Sign full problem thread and lock for immutability' })
    @Roles(UserRole.TenantProf, UserRole.TenantOrg, UserRole.SuperAdmin)
    @Permissions('chronic-care:write')
    @Post('problems/:problemId/sign-thread')
    signProblemThread(
        @TenantId() tenantId: string,
        @CurrentUser() user: { sub: string; resolvedUserId?: string },
        @Param('problemId', ParseUUIDPipe) problemId: string,
        @Body() dto: SignProblemThreadDto,
    ) {
        return this.service.signProblemThread(tenantId, problemId, user.resolvedUserId ?? user.sub, dto);
    }

    @ApiOperation({ summary: 'List prescriptions for a problem' })
    @ApiQuery({ name: 'status', required: false, enum: PrescriptionStatus })
    @Permissions('chronic-care:read')
    @Get('problems/:problemId/prescriptions')
    getPrescriptions(
        @TenantId() tenantId: string,
        @Param('problemId', ParseUUIDPipe) problemId: string,
        @Query('status') status?: PrescriptionStatus,
    ) {
        return this.service.getPrescriptionsByProblem(tenantId, problemId, status);
    }

    @ApiOperation({ summary: 'Cancel a prescription' })
    @Roles(UserRole.TenantProf, UserRole.TenantOrg, UserRole.SuperAdmin)
    @Permissions('chronic-care:write')
    @Patch('prescriptions/:id/cancel')
    cancelPrescription(
        @TenantId() tenantId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body('reason') reason: string,
    ) {
        return this.service.cancelPrescription(tenantId, id, reason);
    }

    // ─── Adherence ───────────────────────────────────────────────

    @ApiOperation({ summary: 'Get adherence summary for a problem (last N days)' })
    @ApiQuery({ name: 'days', required: false, type: Number })
    @Permissions('chronic-care:read')
    @Get('problems/:problemId/adherence')
    getAdherence(
        @TenantId() tenantId: string,
        @Param('problemId', ParseUUIDPipe) problemId: string,
        @Query('days') days = '90',
    ) {
        return this.service.getAdherenceSummary(tenantId, problemId, +days);
    }

    // ─── Dashboard Summary ───────────────────────────────────────

    @ApiOperation({ summary: 'Dashboard problem summary with decompensation badge and overdue alerts' })
    @Permissions('chronic-care:read')
    @Get('patients/:patientId/dashboard')
    getDashboard(
        @TenantId() tenantId: string,
        @Param('patientId', ParseUUIDPipe) patientId: string,
    ) {
        return this.service.getDashboardSummary(tenantId, patientId);
    }
}
