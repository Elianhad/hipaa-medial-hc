import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserResponseDto, UsersListResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @ApiOperation({ summary: 'List users by tenant' })
    @Permissions('users:read')
    @Get('tenant/:tenantId')
    listByTenant(
        @Param('tenantId', ParseUUIDPipe) tenantId: string,
        @Query() query: QueryUsersDto,
    ): Promise<UsersListResponseDto> {
        return this.usersService.listByTenant(tenantId, query);
    }

    @ApiOperation({ summary: 'Find a user by Auth0 subject' })
    @Permissions('users:read')
    @Get('by-auth0/:auth0Sub')
    findByAuth0(
        @Param('auth0Sub') auth0Sub: string,
        @Query('tenantId') tenantId?: string,
    ): Promise<UserResponseDto | null> {
        return this.usersService.findByAuth0Id(auth0Sub, tenantId);
    }

    @ApiOperation({ summary: 'Find a user by id' })
    @Permissions('users:read')
    @Get(':id')
    findById(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('tenantId') tenantId?: string,
    ): Promise<UserResponseDto> {
        return this.usersService.findByIdOrThrow(id, tenantId);
    }

    @ApiOperation({ summary: 'Assert user belongs to tenant' })
    @Permissions('users:read')
    @Post(':id/assert-membership/:tenantId')
    @HttpCode(HttpStatus.OK)
    async assertMembership(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('tenantId', ParseUUIDPipe) tenantId: string,
    ): Promise<{ ok: true }> {
        await this.usersService.assertTenantMembership(id, tenantId);
        return { ok: true };
    }

    @ApiOperation({ summary: 'Create user' })
    @Permissions('users:write')
    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
        return this.usersService.createUser(dto);
    }

    @ApiOperation({ summary: 'Update user role' })
    @Permissions('users:write')
    @Patch(':id/role')
    updateRole(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUserRoleDto,
        @Query('tenantId') tenantId?: string,
    ): Promise<UserResponseDto> {
        return this.usersService.updateUserRole(id, dto.role, tenantId);
    }

    @ApiOperation({ summary: 'Update user active status' })
    @Permissions('users:write')
    @Patch(':id/status')
    updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUserStatusDto,
        @Query('tenantId') tenantId?: string,
    ): Promise<UserResponseDto> {
        return this.usersService.updateUserStatus(id, dto.isActive, tenantId);
    }
}
