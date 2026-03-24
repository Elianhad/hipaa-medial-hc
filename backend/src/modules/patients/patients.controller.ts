import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
  ParseEnumPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { SexType } from '../../common/enums/sex-type.enum';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) { }

  @ApiOperation({ summary: 'List all patients (paginated)' })
  @Permissions('patients:read')
  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.patientsService.findAll(+page, +limit);
  }

  @ApiOperation({ summary: 'Get patient by ID' })
  @Permissions('patients:read')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.patientsService.findById(id);
  }

  @ApiOperation({
    summary: 'Verify identity via RENAPER (returns auto-fill data)',
  })
  @Get('verify/:dni/:sex')
  verifyIdentity(
    @Param('dni') dni: string,
    @Param('sex', new ParseEnumPipe(SexType)) sex: SexType,
  ) {
    return this.patientsService.verifyIdentity(dni, sex);
  }

  @ApiOperation({ summary: 'Register a new patient' })
  @Permissions('patients:write')
  @Post()
  create(@Body() dto: CreatePatientDto) {
    return this.patientsService.create(dto);
  }

  @ApiOperation({
    summary: 'Update patient contact/insurance data (locked identity fields excluded)',
  })
  @Permissions('patients:write')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreatePatientDto>,
  ) {
    return this.patientsService.update(id, dto);
  }
}
