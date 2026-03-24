import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    ParseUUIDPipe,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProfessionalLocationsService } from './professional-locations.service';
import {
    CreateProfessionalLocationDto,
    UpdateProfessionalLocationDto,
    ProfessionalLocationResponseDto,
} from './dto/professional-location.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface AuthenticatedUser {
    sub: string;
    [key: string]: any;
}

@ApiTags('professional-locations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('professionals/:professionalId/locations')
export class ProfessionalLocationsController {
    constructor(
        private readonly locationsService: ProfessionalLocationsService,
    ) { }

    @ApiOperation({ summary: 'List all active locations for a professional' })
    @Get()
    async findAll(
        @Param('professionalId', ParseUUIDPipe) professionalId: string,
    ): Promise<ProfessionalLocationResponseDto[]> {
        return this.locationsService.getLocationsByProfessional(professionalId);
    }

    @ApiOperation({ summary: 'Get a specific location by ID' })
    @Get(':locationId')
    async findOne(
        @Param('professionalId', ParseUUIDPipe) professionalId: string,
        @Param('locationId', ParseUUIDPipe) locationId: string,
    ): Promise<ProfessionalLocationResponseDto> {
        return this.locationsService.getLocationById(professionalId, locationId);
    }

    @ApiOperation({ summary: 'Create a new location for a professional' })
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Param('professionalId', ParseUUIDPipe) professionalId: string,
        @Body() dto: CreateProfessionalLocationDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<ProfessionalLocationResponseDto> {
        // TODO: Validate that the authenticated user owns this professional profile
        return this.locationsService.createLocation(professionalId, user.sub, dto);
    }

    @ApiOperation({ summary: 'Update a location' })
    @Patch(':locationId')
    async update(
        @Param('professionalId', ParseUUIDPipe) professionalId: string,
        @Param('locationId', ParseUUIDPipe) locationId: string,
        @Body() dto: UpdateProfessionalLocationDto,
    ): Promise<ProfessionalLocationResponseDto> {
        return this.locationsService.updateLocation(professionalId, locationId, dto);
    }

    @ApiOperation({ summary: 'Soft-delete a location' })
    @Delete(':locationId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(
        @Param('professionalId', ParseUUIDPipe) professionalId: string,
        @Param('locationId', ParseUUIDPipe) locationId: string,
    ): Promise<void> {
        return this.locationsService.deleteLocation(professionalId, locationId);
    }
}
