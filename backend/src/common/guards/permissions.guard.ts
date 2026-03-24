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
        const tokenPermissionSet = new Set(tokenPermissions);
        const missingPermissions = requiredPermissions.filter(
            (requiredPermission) => !tokenPermissionSet.has(requiredPermission),
        );

        if (missingPermissions.length) {
            throw new ForbiddenException(
                `Missing required permission(s): ${missingPermissions.join(', ')}`,
            );
        }

        return true;
    }
}