import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';
import { extractNormalizedRoles, hasRole } from '../auth/role-claims';

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

    if (!allowed) {
      const detectedRoles = normalizedRoles.join(', ') || UserRole.Paciente;
      throw new ForbiddenException(
        `Role(s) '${detectedRoles}' are not allowed to access this resource`,
      );
    }

    return true;
  }
}
