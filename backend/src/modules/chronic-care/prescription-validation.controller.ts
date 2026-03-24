import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChronicCareService } from './chronic-care.service';

@ApiTags('prescription-validation')
@Controller('public/prescriptions')
export class PrescriptionValidationController {
    constructor(private readonly service: ChronicCareService) { }

    @ApiOperation({ summary: 'Validate digital prescription by QR token (public endpoint)' })
    @Get('validate/:token')
    validate(@Param('token') token: string) {
        return this.service.validatePrescriptionToken(token);
    }
}
