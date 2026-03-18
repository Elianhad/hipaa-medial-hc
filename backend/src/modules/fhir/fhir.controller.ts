import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FhirService } from './fhir.service';

@ApiTags('fhir')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('fhir')
export class FhirController {
  constructor(private readonly fhirService: FhirService) {}

  @ApiOperation({ summary: 'Retrieve any FHIR resource from AWS HealthLake' })
  @Get(':resourceType/:resourceId')
  getResource(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.fhirService.getResource(resourceType, resourceId);
  }
}
