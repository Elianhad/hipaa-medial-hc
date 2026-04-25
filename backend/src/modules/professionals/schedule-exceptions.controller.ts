import {
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Body,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CreateScheduleExceptionDto } from './dto/create-schedule-exception.dto';
import { ScheduleException } from './schedule-exception.entity';
import { ScheduleExceptionsService } from './schedule-exceptions.service';

interface AuthenticatedUser {
    sub: string;
    resolvedUserId?: string;
    [key: string]: unknown;
}

@ApiTags('schedule-exceptions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('professionals/:professionalId/exceptions')
export class ScheduleExceptionsController {
    constructor(private readonly exceptionsService: ScheduleExceptionsService) { }

    @ApiOperation({ summary: 'Create a schedule exception for a professional' })
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Param('professionalId', ParseUUIDPipe) professionalId: string,
        @Body() dto: CreateScheduleExceptionDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<ScheduleException> {
        return this.exceptionsService.createException(professionalId, user.sub, dto);
    }

    @ApiOperation({ summary: 'List future schedule exceptions for a professional' })
    @Get()
    async findFuture(
        @Param('professionalId', ParseUUIDPipe) professionalId: string,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<ScheduleException[]> {
        return this.exceptionsService.getFutureExceptions(professionalId, user.sub);
    }

    @ApiOperation({ summary: 'Delete a schedule exception' })
    @Delete(':exceptionId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(
        @Param('professionalId', ParseUUIDPipe) professionalId: string,
        @Param('exceptionId', ParseUUIDPipe) exceptionId: string,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<void> {
        await this.exceptionsService.deleteException(professionalId, exceptionId, user.sub);
    }
}
