import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { extractNormalizedRoles } from '../auth/role-claims';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

type JwtUser = Record<string, unknown> | undefined;

const ROLE_PERMISSION_FALLBACKS: Record<string, string[]> = {
    professional: [
        'clinical-records:read',
        'clinical-records:write',
        'chronic-care:read',
        'chronic-care:write',
    ],
    tenantprof: [
        'clinical-records:read',
        'clinical-records:write',
        'chronic-care:read',
        'chronic-care:write',
    ],
    orgadmin: [
        'clinical-records:read',
        'clinical-records:write',
        'chronic-care:read',
        'chronic-care:write',
    ],
    orgstaff: [
        'clinical-records:read',
        'clinical-records:write',
        'chronic-care:read',
        'chronic-care:write',
    ],
    tenantorg: [
        'clinical-records:read',
        'clinical-records:write',
        'chronic-care:read',
        'chronic-care:write',
    ],
};

function extractTokenPermissions(user: JwtUser): string[] {
    if (!user) {
        return [];
    }

    const permissions = new Set<string>();

    const claim = user.permissions;
    if (Array.isArray(claim)) {
        for (const permission of claim) {
            if (typeof permission === 'string' && permission.trim()) {
                permissions.add(permission.trim());
            }
        }
    }

    const scope = user.scope;
    if (typeof scope === 'string' && scope.trim()) {
        for (const scopedPermission of scope.split(' ')) {
            if (scopedPermission.trim()) {
                permissions.add(scopedPermission.trim());
            }
        }
    }

    return Array.from(permissions);
}

function extractRoleFallbackPermissions(normalizedRoles: string[]): string[] {
    const permissions = new Set<string>();

    for (const role of normalizedRoles) {
        const grantedPermissions = ROLE_PERMISSION_FALLBACKS[role];
        if (!grantedPermissions) {
            continue;
        }

        for (const permission of grantedPermissions) {
            permissions.add(permission);
        }
    }

    return Array.from(permissions);
}

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredPermissions?.length) {
            return true;
        }

        const request = context.switchToHttp().getRequest<{ user?: JwtUser }>();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('Missing authenticated user for permission validation');
        }

        const normalizedRoles = extractNormalizedRoles(user);
        if (normalizedRoles.includes('superadmin')) {
            return true;
        }

        const tokenPermissions = extractTokenPermissions(user);
        const roleFallbackPermissions = extractRoleFallbackPermissions(normalizedRoles);
        const effectivePermissionSet = new Set([...tokenPermissions, ...roleFallbackPermissions]);

        const missingPermissions = requiredPermissions.filter(
            (requiredPermission) => !effectivePermissionSet.has(requiredPermission),
        );

        if (missingPermissions.length) {
            throw new ForbiddenException(
                `Missing required permission(s): ${missingPermissions.join(', ')}`,
            );
        }

        return true;
    }
}
