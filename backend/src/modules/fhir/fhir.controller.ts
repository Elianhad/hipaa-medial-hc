import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FhirService } from './fhir.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('fhir')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('fhir')
export class FhirController {
  constructor(private readonly fhirService: FhirService) { }

  @ApiOperation({ summary: 'Retrieve any FHIR resource from AWS HealthLake' })
  @Permissions('fhir:read')
  @Get(':resourceType/:resourceId')
  getResource(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.fhirService.getResource(resourceType, resourceId);
  }
}
