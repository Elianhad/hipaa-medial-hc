import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @TenantId() — extracts the resolved tenant UUID from the request object.
 * Populated by TenantMiddleware.
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const tenantFromRequest = request.tenantId;
    if (typeof tenantFromRequest === 'string' && tenantFromRequest.trim().length > 0) {
      return tenantFromRequest.trim();
    }

    const headerValue = request.headers?.['x-tenant-id'];
    if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
      return headerValue.trim();
    }

    if (Array.isArray(headerValue)) {
      const firstHeader = headerValue.find(
        (value) => typeof value === 'string' && value.trim().length > 0,
      );
      if (firstHeader) {
        return firstHeader.trim();
      }
    }

    return undefined as unknown as string;
  },
);
