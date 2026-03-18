import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * TenantMiddleware
 *
 * Resolves the current tenant from the request subdomain (or X-Tenant-ID header
 * as a fallback for local development) and sets PostgreSQL session variables
 * used by the Row-Level Security policies:
 *   - app.current_tenant_id
 *   - app.current_user_auth0_sub
 *   - app.user_role
 *
 * This must run AFTER the JWT guard so that req.user is populated.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async use(req: Request & { user?: any }, _res: Response, next: NextFunction) {
    // Resolve tenant from subdomain  (e.g. "clinica" from clinica.miapp.com)
    const subdomain = this.extractSubdomain(req.hostname);
    const tenantIdHeader = req.headers['x-tenant-id'] as string | undefined;

    const tenantIdentifier = subdomain ?? tenantIdHeader;
    if (!tenantIdentifier) {
      return next(); // public routes — no tenant context
    }

    // Look up tenant in DB (use a raw query so we can set session vars
    // on the same connection later)
    const result = await this.dataSource.query(
      `SELECT id FROM tenants WHERE subdomain = $1 AND status = 'active' LIMIT 1`,
      [tenantIdentifier],
    );

    if (!result.length) {
      throw new UnauthorizedException('Tenant not found or inactive');
    }

    const tenantId: string = result[0].id;
    const auth0Sub: string = req.user?.sub ?? '';
    const userRole: string = req.user?.['https://hipaa-hce/role'] ?? '';

    // Set PostgreSQL session variables for RLS
    await this.dataSource.query(`
      SELECT
        set_config('app.current_tenant_id',       $1, TRUE),
        set_config('app.current_user_auth0_sub',  $2, TRUE),
        set_config('app.user_role',               $3, TRUE)
    `, [tenantId, auth0Sub, userRole]);

    // Attach to request for downstream use
    req['tenantId'] = tenantId;

    next();
  }

  private extractSubdomain(hostname: string): string | null {
    const parts = hostname.split('.');
    // e.g. clinica.miproyecto.com → ['clinica', 'miproyecto', 'com']
    if (parts.length >= 3) {
      return parts[0];
    }
    return null;
  }
}
