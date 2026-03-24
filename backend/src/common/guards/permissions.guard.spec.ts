import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

function buildExecutionContext(user?: Record<string, unknown>) {
    return {
        getHandler: jest.fn(() => ({})),
        getClass: jest.fn(() => class TestClass { }),
        switchToHttp: jest.fn(() => ({
            getRequest: jest.fn(() => ({ user })),
        })),
    } as any;
}

describe('PermissionsGuard', () => {
    let reflector: jest.Mocked<Reflector>;
    let guard: PermissionsGuard;

    beforeEach(() => {
        reflector = {
            getAllAndOverride: jest.fn(),
        } as unknown as jest.Mocked<Reflector>;

        guard = new PermissionsGuard(reflector);
    });

    it('allows request when endpoint has no required permissions', () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        const context = buildExecutionContext();

        expect(guard.canActivate(context)).toBe(true);
    });

    it('throws when endpoint requires permissions but request has no user', () => {
        reflector.getAllAndOverride.mockReturnValue(['patients:read']);
        const context = buildExecutionContext(undefined);

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        expect(() => guard.canActivate(context)).toThrow(
            'Missing authenticated user for permission validation',
        );
    });

    it('allows superadmin role without explicit token permissions', () => {
        reflector.getAllAndOverride.mockReturnValue(['tenants:write']);
        const context = buildExecutionContext({
            roles: ['superadmin'],
        });

        expect(guard.canActivate(context)).toBe(true);
    });

    it('allows request when all required permissions are in permissions claim', () => {
        reflector.getAllAndOverride.mockReturnValue([
            'patients:read',
            'patients:write',
        ]);
        const context = buildExecutionContext({
            permissions: ['patients:read', 'patients:write', 'appointments:read'],
            roles: ['Professional'],
        });

        expect(guard.canActivate(context)).toBe(true);
    });

    it('allows request when required permission is in scope claim', () => {
        reflector.getAllAndOverride.mockReturnValue(['auth-context:read']);
        const context = buildExecutionContext({
            scope: 'openid profile auth-context:read',
            roles: ['OrgAdmin'],
        });

        expect(guard.canActivate(context)).toBe(true);
    });

    it('merges permissions and scope claims before validating', () => {
        reflector.getAllAndOverride.mockReturnValue([
            'patients:read',
            'auth-context:read',
        ]);
        const context = buildExecutionContext({
            permissions: ['patients:read'],
            scope: 'openid profile auth-context:read',
            roles: ['OrgStaff'],
        });

        expect(guard.canActivate(context)).toBe(true);
    });

    it('throws with missing required permissions list', () => {
        reflector.getAllAndOverride.mockReturnValue([
            'patients:read',
            'patients:write',
        ]);
        const context = buildExecutionContext({
            permissions: ['patients:read'],
            scope: 'openid profile',
            roles: ['Professional'],
        });

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        expect(() => guard.canActivate(context)).toThrow(
            'Missing required permission(s): patients:write',
        );
    });
});
