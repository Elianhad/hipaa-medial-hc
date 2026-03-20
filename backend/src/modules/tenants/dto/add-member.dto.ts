import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { MemberRole } from '../tenant-membership.entity';

export class AddMemberDto {
    @IsUUID()
    userId: string;

    @IsEnum(MemberRole)
    @IsOptional()
    role?: MemberRole;
}
