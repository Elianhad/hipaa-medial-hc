import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @TenantId() — extracts the resolved tenant UUID from the request object.
 * Populated by TenantMiddleware.
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId;
  },
);
