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
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('appointments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('appointments')
export class AppointmentsController {
    constructor(private readonly appointmentsService: AppointmentsService) { }

    @ApiOperation({ summary: 'Get daily board for a professional (today by default)' })
    @Permissions('appointments:read')
    @Get('professional/:professionalId/today')
    getTodayBoard(
        @Param('professionalId', ParseUUIDPipe) professionalId: string,
        @Query('tenantId') tenantId?: string,
        @Query('date') date?: string,
    ) {
        return this.appointmentsService.getTodayByProfessional(professionalId, tenantId, date);
    }

    @ApiOperation({ summary: "Get today's appointments for all professionals in an organization" })
    @Permissions('appointments:read')
    @Get('organization/:tenantId/today')
    getOrgTodayBoard(
        @Param('tenantId', ParseUUIDPipe) tenantId: string,
        @Query('date') date?: string,
    ) {
        return this.appointmentsService.getTodayByOrganization(tenantId, date);
    }

    @ApiOperation({ summary: 'Mark attendance for an appointment (present/absent/pending)' })
    @Permissions('appointments:write')
    @Patch(':id/attendance')
    updateAttendance(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateAppointmentAttendanceDto,
        @Query('tenantId') tenantId?: string,
    ) {
        return this.appointmentsService.updateAttendance(id, dto, tenantId);
    }
}
