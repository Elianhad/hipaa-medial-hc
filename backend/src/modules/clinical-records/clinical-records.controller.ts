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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClinicalRecordsService } from './clinical-records.service';
import { CreateEvolutionDto } from './dto/create-evolution.dto';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('clinical-records')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('clinical-records')
export class ClinicalRecordsController {
  constructor(private readonly service: ClinicalRecordsService) {}

  @ApiOperation({ summary: 'Create a SOAP evolution (HCOP)' })
  @Roles(UserRole.TenantProf, UserRole.TenantOrg, UserRole.SuperAdmin)
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
  @Get('evolutions/:id')
  getEvolution(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getEvolutionById(id);
  }

  @ApiOperation({ summary: 'Create a problem (HCOP)' })
  @Roles(UserRole.TenantProf, UserRole.TenantOrg, UserRole.SuperAdmin)
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

  @ApiOperation({ summary: 'List problems for a patient' })
  @Get('problems/patient/:patientId')
  getProblems(
    @TenantId() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getProblemsByPatient(tenantId, patientId);
  }
}
