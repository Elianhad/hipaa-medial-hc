import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ClinicalRecordsService } from './clinical-records.service';
import { CreateEvolutionDto } from './dto/create-evolution.dto';
import { CreateProblemWithEvolutionDto } from './dto/create-problem-with-evolution.dto';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums/user-role.enum';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('clinical-records')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
@Controller('clinical-records')
export class ClinicalRecordsController {
  constructor(private readonly service: ClinicalRecordsService) { }

  @ApiOperation({ summary: 'Create a SOAP evolution (HCOP)' })
  @Roles(UserRole.Professional)
  @Permissions('clinical-records:write')
  @Post('evolutions')
  createEvolution(
    @TenantId() tenantId: string,
    @CurrentUser() user: { sub: string; resolvedUserId?: string },
    @Body() dto: CreateEvolutionDto,
  ) {
    return this.service.createEvolution(
      tenantId,
      user.resolvedUserId ?? user.sub,
      dto,
    );
  }

  @ApiOperation({ summary: 'List evolutions for a patient' })
  @Permissions('clinical-records:read')
  @Get('evolutions/patient/:patientId')
  getEvolutions(
    @TenantId() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.service.getEvolutionsByPatient(
      tenantId,
      patientId,
      +page,
      +limit,
    );
  }

  @ApiOperation({ summary: 'Get a specific evolution' })
  @Permissions('clinical-records:read')
  @Get('evolutions/:id')
  getEvolution(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getEvolutionById(id);
  }

  @ApiOperation({ summary: 'Create a problem (HCOP) — legacy endpoint' })
  @Roles(UserRole.Professional, UserRole.SuperAdmin)
  @Permissions('clinical-records:write')
  @Post('problems')
  createProblem(
    @TenantId() tenantId: string,
    @CurrentUser() user: { sub: string; resolvedUserId?: string },
    @Body() dto: any,
  ) {
    return this.service.createProblem(
      tenantId,
      user.resolvedUserId ?? user.sub,
      dto,
    );
  }

  @ApiOperation({
    summary: 'Verificar si ya existe un problema activo con el mismo código para el paciente',
    description:
      'Se llama durante el llenado del formulario (onBlur del campo de código) para advertir ' +
      'al profesional antes del submit. Devuelve el problema existente o null.',
  })
  @ApiQuery({ name: 'patientId', required: true })
  @ApiQuery({ name: 'snomedCode', required: false })
  @ApiQuery({ name: 'icd10Code', required: false })
  @ApiQuery({ name: 'icd11Code', required: false })
  @Permissions('clinical-records:read')
  @Get('problems/duplicate-check')
  checkProblemDuplicate(
    @TenantId() tenantId: string,
    @Query('patientId', ParseUUIDPipe) patientId: string,
    @Query('snomedCode') snomedCode?: string,
    @Query('icd10Code') icd10Code?: string,
    @Query('icd11Code') icd11Code?: string,
  ) {
    return this.service.checkProblemDuplicate(tenantId, patientId, snomedCode, icd10Code, icd11Code);
  }

  @ApiOperation({
    summary: 'Crear problema clínico con primera evolución SOAP (acción atómica)',
    description:
      'Crea el problema y su primera evolución SOAP en una sola transacción. ' +
      'Si se envía recurrenceOfProblemId, el estado clínico se establece como recidiva.',
  })
  @Roles(UserRole.Professional, UserRole.SuperAdmin)
  @Permissions('clinical-records:write')
  @Post('problems/with-evolution')
  createProblemWithEvolution(
    @TenantId() tenantId: string,
    @CurrentUser() user: { sub: string; resolvedUserId?: string },
    @Body() dto: CreateProblemWithEvolutionDto,
  ) {
    return this.service.createProblemWithEvolution(
      tenantId,
      user.resolvedUserId ?? user.sub,
      dto,
    );
  }

  @ApiOperation({ summary: 'List problems for a patient' })
  @Permissions('clinical-records:read')
  @Get('problems/patient/:patientId')
  getProblems(
    @TenantId() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getProblemsByPatient(tenantId, patientId);
  }
}
