import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class CreateUserDto {
    @IsUUID()
    tenantId: string;

    @IsString()
    @Length(3, 255)
    auth0Sub: string;

    @IsEnum(UserRole)
    role: UserRole;

    @IsEmail()
    @Length(3, 255)
    email: string;

    @IsOptional()
    @IsString()
    @Length(1, 100)
    firstName?: string;

    @IsOptional()
    @IsString()
    @Length(1, 100)
    lastName?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
