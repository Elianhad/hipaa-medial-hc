import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AvailabilityService, DaySlots } from './availability.service';
import { QueryAvailabilityDto } from './dto/query-availability.dto';

@ApiTags('availability')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('professionals/:professionalId/locations/:locationId')
export class AvailabilityController {
    constructor(private readonly availabilityService: AvailabilityService) { }

    @ApiOperation({
        summary: 'Get available appointment slots',
        description:
            'Returns available time slots grouped by day. Excludes slots blocked by ' +
            'schedule exceptions (vacations, holidays) and already booked appointments.',
    })
    @ApiQuery({ name: 'startDate', example: '2026-04-01', description: 'YYYY-MM-DD' })
    @ApiQuery({ name: 'endDate', example: '2026-04-30', description: 'YYYY-MM-DD' })
    @Get('availability')
    async getAvailability(
        @Param('professionalId', ParseUUIDPipe) professionalId: string,
        @Param('locationId', ParseUUIDPipe) locationId: string,
        @Query() query: QueryAvailabilityDto,
    ): Promise<DaySlots[]> {
        return this.availabilityService.getAvailableSlots(
            professionalId,
            locationId,
            query.startDate,
            query.endDate,
        );
    }
}
