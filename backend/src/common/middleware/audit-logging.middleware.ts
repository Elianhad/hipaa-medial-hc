import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export interface AuditLogEntry {
    id: string;
    timestamp: string;
    userId?: string;
    userEmail?: string;
    action: string;
    resource: string;
    method: string;
    statusCode: number;
    clientIp: string;
    userAgent?: string;
    details?: Record<string, unknown>;
}

/**
 * AuditLoggingMiddleware
 *
 * Logs all access attempts to dashboard and sensitive endpoints for compliance:
 * - Login attempts (success/failure)
 * - Role validation failures
 * - Dashboard access attempts
 * - Data access patterns
 *
 * Logs are kept in-memory with JSON serialization to console.
 * For production: Integrate with persistent audit log storage (DB, CloudWatch, etc.)
 */
@Injectable()
export class AuditLoggingMiddleware implements NestMiddleware {
    private readonly logger = new Logger('Audit');

    use(req: Request, res: Response, next: NextFunction) {
        const startTime = Date.now();
        const requestId = randomUUID();

        // Capture response
        const originalSend = res.send;
        res.send = function (data: any) {
            const statusCode = res.statusCode;
            const path = req.path;
            const method = req.method;
            const clientIp = this.getClientIp(req);

            // Log dashboard access
            if (path.includes('/v1/dashboard')) {
                const user = (req as any).user;
                this.logAuditEvent({
                    id: requestId,
                    timestamp: new Date().toISOString(),
                    userId: user?.sub,
                    userEmail: user?.email,
                    action: 'DASHBOARD_ACCESS',
                    resource: path,
                    method,
                    statusCode,
                    clientIp,
                    userAgent: req.headers['user-agent'],
                    details: {
                        duration: Date.now() - startTime,
                        query: req.query,
                    },
                });
            }

            // Log auth attempts
            if (path.includes('/auth')) {
                const user = (req as any).user;
                this.logAuditEvent({
                    id: requestId,
                    timestamp: new Date().toISOString(),
                    userId: user?.sub,
                    userEmail: req.body?.email || user?.email,
                    action: statusCode >= 400 ? 'AUTH_FAILURE' : 'AUTH_SUCCESS',
                    resource: path,
                    method,
                    statusCode,
                    clientIp,
                    userAgent: req.headers['user-agent'],
                    details: {
                        duration: Date.now() - startTime,
                    },
                });
            }

            // Log role validation failures
            if (statusCode === 403 && path.includes('/dashboard')) {
                const user = (req as any).user;
                this.logAuditEvent({
                    id: requestId,
                    timestamp: new Date().toISOString(),
                    userId: user?.sub,
                    userEmail: user?.email,
                    action: 'ROLE_VALIDATION_FAILED',
                    resource: path,
                    method,
                    statusCode,
                    clientIp,
                    userAgent: req.headers['user-agent'],
                    details: {
                        roles: this.extractRoles((req as any).user),
                    },
                });
            }

            res.send = originalSend;
            return originalSend.call(this, data);
        }.bind(this);

        next();
    }

    private logAuditEvent(entry: AuditLogEntry) {
        this.logger.log(JSON.stringify(entry, null, 2));
    }

    private getClientIp(req: Request): string {
        return (
            (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
            (req.headers['x-real-ip'] as string) ||
            req.socket.remoteAddress ||
            'unknown'
        );
    }

    private extractRoles(user: any): string[] {
        if (!user) return [];

        const roles = new Set<string>();
        const claimKeys = [
            'roles',
            'role',
            'https://hipaa-hce.example.com/roles',
            'https://hipaa-hce.example.com/role',
        ];

        for (const key of claimKeys) {
            const value = user[key];
            if (typeof value === 'string') roles.add(value);
            if (Array.isArray(value)) value.forEach((r: any) => roles.add(r));
        }

        return Array.from(roles);
    }
}
