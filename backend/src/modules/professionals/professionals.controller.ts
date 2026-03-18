import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';

@ApiTags('professionals')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @ApiOperation({ summary: 'List all professionals (paginated)' })
  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.professionalsService.findAll(+page, +limit);
  }

  @ApiOperation({
    summary: 'Verify professional license via SISA (returns auto-fill data)',
  })
  @Get('verify/:licenseNumber')
  verifyLicense(@Param('licenseNumber') licenseNumber: string) {
    return this.professionalsService.verifyLicense(licenseNumber);
  }

  @ApiOperation({ summary: 'Get professional by ID' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.findById(id);
  }

  @ApiOperation({ summary: 'Register a new professional with SISA license validation' })
  @Post()
  create(@Body() dto: CreateProfessionalDto) {
    return this.professionalsService.create(dto);
  }
}
