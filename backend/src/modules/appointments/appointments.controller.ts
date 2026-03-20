import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { UpdateAppointmentAttendanceDto } from './dto/update-appointment-attendance.dto';

@ApiTags('appointments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('appointments')
export class AppointmentsController {
    constructor(private readonly appointmentsService: AppointmentsService) { }

    @ApiOperation({ summary: 'Get daily board for a professional (today by default)' })
    @Get('professional/:professionalId/today')
    getTodayBoard(
        @Param('professionalId', ParseUUIDPipe) professionalId: string,
        @Query('tenantId') tenantId?: string,
        @Query('date') date?: string,
    ) {
        return this.appointmentsService.getTodayByProfessional(professionalId, tenantId, date);
    }

    @ApiOperation({ summary: 'Mark attendance for an appointment (present/absent/pending)' })
    @Patch(':id/attendance')
    updateAttendance(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateAppointmentAttendanceDto,
        @Query('tenantId') tenantId?: string,
    ) {
        return this.appointmentsService.updateAttendance(id, dto, tenantId);
    }
}
