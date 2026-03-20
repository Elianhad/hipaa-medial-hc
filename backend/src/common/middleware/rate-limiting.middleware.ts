import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
    [key: string]: { attempts: number; resetTime: number };
}

/**
 * RateLimitingMiddleware
 *
 * Implements rate limiting for login and sensitive endpoints:
 * - /api/auth/login: 5 attempts per 15 minutes per IP
 * - /api/v1/dashboard/*: 50 requests per minute per user
 * - /api/v1/tenants/by-subdomain/*: 20 requests per minute per IP
 *
 * Store is in-memory (suitable for development/small deployments).
 * For production: Use Redis or similar distributed cache.
 */
@Injectable()
export class RateLimitingMiddleware implements NestMiddleware {
    private readonly logger = new Logger('RateLimit');
    private store: RateLimitStore = {};

    use(req: Request, res: Response, next: NextFunction) {
        const path = req.path;
        const clientIp = this.getClientIp(req);

        // Apply rate limiting to specific endpoints
        if (path.includes('/auth/login') || path.includes('/api/auth/login')) {
            this.checkLimit('login', clientIp, 5, 15 * 60 * 1000, req);
        } else if (path.includes('/v1/dashboard')) {
            const userId = (req as any).user?.sub || clientIp;
            this.checkLimit('dashboard', userId, 50, 60 * 1000, req);
        } else if (path.includes('/v1/tenants/by-subdomain')) {
            this.checkLimit('tenant-lookup', clientIp, 20, 60 * 1000, req);
        }

        next();
    }

    private checkLimit(
        limitName: string,
        identifier: string,
        maxAttempts: number,
        windowMs: number,
        req: Request,
    ) {
        const key = `${limitName}:${identifier}`;
        const now = Date.now();

        if (!this.store[key]) {
            this.store[key] = { attempts: 1, resetTime: now + windowMs };
            return;
        }

        const record = this.store[key];

        // Reset window if expired
        if (now > record.resetTime) {
            this.store[key] = { attempts: 1, resetTime: now + windowMs };
            return;
        }

        // Increment attempts
        record.attempts++;

        if (record.attempts > maxAttempts) {
            const remainingTime = Math.ceil((record.resetTime - now) / 1000);
            this.logger.warn(
                `Rate limit exceeded: ${limitName} for ${identifier}, attempts=${record.attempts}/${maxAttempts}`,
            );
            throw new HttpException(
                `Too many requests. Try again in ${remainingTime} seconds.`,
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }
    }

    private getClientIp(req: Request): string {
        return (
            (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
            (req.headers['x-real-ip'] as string) ||
            req.socket.remoteAddress ||
            'unknown'
        );
    }
}
