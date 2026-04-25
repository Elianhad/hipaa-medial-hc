import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UserRole } from '../enums/user-role.enum';
import { extractNormalizedRoles, hasRole } from '../auth/role-claims';

type JwtUser = Record<string, unknown> | undefined;

function extractTokenPermissions(user: JwtUser): Set<string> {
  const permissions = new Set<string>();
  if (!user) {
    return permissions;
  }

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

  return permissions;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const normalizedRoles = extractNormalizedRoles(user);

    const allowed = requiredRoles.some((requiredRole) =>
      hasRole(normalizedRoles, requiredRole),
    );

    if (allowed) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Compatibility fallback: some Auth0 tokens include permissions but omit role claims.
    if (requiredPermissions?.length) {
      const tokenPermissionSet = extractTokenPermissions(user);
      const hasAllRequiredPermissions = requiredPermissions.every(
        (requiredPermission) => tokenPermissionSet.has(requiredPermission),
      );

      if (hasAllRequiredPermissions) {
        return true;
      }
    }

    const detectedRoles = normalizedRoles.join(', ') || UserRole.Paciente;
    throw new ForbiddenException(
      `Role(s) '${detectedRoles}' are not allowed to access this resource`,
    );
  }
}
