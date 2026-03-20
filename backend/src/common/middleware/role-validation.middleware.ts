import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

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
        const roles = this.extractRoles(req.user);

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

    private extractRoles(user: any): string[] {
        const roles = new Set<string>();

        const claimKeys = [
            'roles',
            'role',
            'https://hipaa-hce.example.com/roles',
            'https://hipaa-hce.example.com/role',
            'https://hipaa-medial-hc.example.com/roles',
            'https://hipaa-medial-hc.example.com/role',
        ];

        for (const key of claimKeys) {
            const value = user[key];
            if (typeof value === 'string' && value.trim()) {
                roles.add(this.normalizeRole(value));
            }
            if (Array.isArray(value)) {
                for (const role of value) {
                    if (typeof role === 'string' && role.trim()) {
                        roles.add(this.normalizeRole(role));
                    }
                }
            }
        }

        return Array.from(roles);
    }

    private normalizeRole(role: string): string {
        return role.trim().toLowerCase().replace(/[\s_-]+/g, '');
    }

    private hasProfessionalRole(roles: string[]): boolean {
        const accepted = ['professional', 'tenantprof', 'prof'];
        return roles.some((role) => accepted.includes(role));
    }

    private hasOrganizationRole(roles: string[]): boolean {
        const accepted = ['orgadmin', 'orgstaff'];
        return roles.some((role) => accepted.includes(role));
    }
}
