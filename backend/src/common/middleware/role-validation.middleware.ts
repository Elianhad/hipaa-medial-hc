import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { extractNormalizedRoles, hasRole } from '../auth/role-claims';
import { UserRole } from '../enums/user-role.enum';

interface AuthenticatedRequest extends Request {
    user?: {
        sub: string;
        email?: string;
        'https://hipaa-hce.example.com/roles'?: string[];
        [key: string]: unknown;
    };
    tenantId?: string;
}

/**
 * RoleValidationMiddleware
 *
 * Validates user roles for protected dashboard routes:
 * - /api/v1/dashboard/professional/* requires 'professional' role
 * - /api/v1/dashboard/organization/* requires 'orgadmin|orgstaff' role
 * - /api/v1/dashboard/patient/* requires 'patient' role (always allowed if authenticated)
 *
 * Purpose: Server-side enforcement of role access control (complementary to client guards)
 */
@Injectable()
export class RoleValidationMiddleware implements NestMiddleware {
    private readonly logger = new Logger('RoleValidation');

    use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        const path = req.path;

        // Only validate dashboard routes
        if (!path.startsWith('/v1/dashboard')) {
            return next();
        }

        // Routes that don't require authentication
        if (path.includes('/public')) {
            return next();
        }

        // Check if user is authenticated
        if (!req.user) {
            this.logger.warn(`Unauthenticated access attempt to ${path}`);
            throw new ForbiddenException('Authentication required');
        }

        const userSub = req.user.sub;
        const roles = extractNormalizedRoles(req.user);

        // Professional portal access
        if (path.includes('/professional')) {
            if (!this.hasProfessionalRole(roles)) {
                this.logger.warn(
                    `Unauthorized professional access: user=${userSub}, roles=[${roles.join(',')}], path=${path}`,
                );
                throw new ForbiddenException('Professional role required');
            }
            this.logger.debug(`Professional access granted: user=${userSub}, path=${path}`);
        }

        // Organization portal access
        if (path.includes('/organization')) {
            if (!this.hasOrganizationRole(roles)) {
                this.logger.warn(
                    `Unauthorized organization access: user=${userSub}, roles=[${roles.join(',')}], path=${path}`,
                );
                throw new ForbiddenException('Organization role (admin/staff) required');
            }
            this.logger.debug(`Organization access granted: user=${userSub}, path=${path}`);
        }

        // Patient portal access (always allowed if authenticated)
        if (path.includes('/patient')) {
            this.logger.debug(`Patient access granted: user=${userSub}, path=${path}`);
        }

        next();
    }

    private hasProfessionalRole(roles: string[]): boolean {
        return hasRole(roles, UserRole.Professional) || hasRole(roles, UserRole.TenantProf);
    }

    private hasOrganizationRole(roles: string[]): boolean {
        return (
            hasRole(roles, UserRole.OrgAdmin)
            || hasRole(roles, UserRole.OrgStaff)
            || hasRole(roles, UserRole.TenantOrg)
        );
    }
}
