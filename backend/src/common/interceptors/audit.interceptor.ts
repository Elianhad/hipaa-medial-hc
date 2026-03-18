import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../modules/audit/audit-log.entity';

/**
 * AuditInterceptor
 *
 * Automatically writes an audit log entry for every mutating request
 * (POST / PUT / PATCH / DELETE) to satisfy HIPAA access-tracking requirements.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method: string = request.method;

    // Only track write operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const tenantId: string | undefined = request.tenantId;
    const user = request.user;
    const userId: string | undefined = request['resolvedUserId'];
    const patientId: string | undefined =
      request.params?.patientId ?? request.body?.patientId;

    return next.handle().pipe(
      tap(() => {
        const log = this.auditRepo.create({
          tenantId,
          userId,
          patientId,
          action: `${method}_${context.getHandler().name.toUpperCase()}`,
          resourceType: context.getClass().name,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          metadata: {
            path: request.path,
            params: request.params,
          },
        });

        // Fire-and-forget — don't block the response
        this.auditRepo.save(log).catch(() => {
          // Audit failures must never break the main flow
        });
      }),
    );
  }
}
