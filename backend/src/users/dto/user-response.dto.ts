import { UserRole } from '../../common/enums/user-role.enum';

export interface UserResponseDto {
    id: string;
    tenantId: string;
    auth0Sub: string;
    role: UserRole;
    email: string;
    firstName: string | null;
    lastName: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface UsersListResponseDto {
    data: UserResponseDto[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
