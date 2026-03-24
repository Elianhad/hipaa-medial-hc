import { Injectable } from '@nestjs/common';
import { extractNormalizedRoles } from '../../common/auth/role-claims';
import { AuthContextResponse, AccessContext } from './contracts/auth-context.contract';

@Injectable()
export class AuthContextService {
    build(user: Record<string, unknown> | undefined): AuthContextResponse {
        const roles = extractNormalizedRoles(user);

        const contexts: AccessContext[] = [
            {
                kind: 'patient',
                enabled: true,
                label: 'Paciente',
            },
        ];

        if (this.hasAnyRole(roles, ['professional', 'tenantprof', 'prof'])) {
            contexts.push({
                kind: 'professional',
                enabled: true,
                label: 'Profesional',
            });
        }

        if (this.hasAnyRole(roles, ['orgadmin', 'orgstaff', 'tenantorg'])) {
            contexts.push({
                kind: 'organization',
                enabled: true,
                label: 'Organizacion',
            });
        }

        if (this.hasAnyRole(roles, ['superadmin'])) {
            contexts.push({
                kind: 'superadmin',
                enabled: true,
                label: 'SuperAdmin',
            });
        }

        const defaultContext = this.resolveDefaultContext(roles);

        return {
            identity: {
                sub: this.getClaimAsString(user, 'sub') ?? '',
                email: this.getClaimAsString(user, 'email'),
                name: this.getClaimAsString(user, 'name'),
            },
            roles,
            contexts,
            defaultContext,
        };
    }

    private resolveDefaultContext(roles: string[]): 'patient' | 'professional' | 'organization' | 'superadmin' {
        if (this.hasAnyRole(roles, ['orgadmin', 'orgstaff', 'tenantorg'])) {
            return 'organization';
        }

        // Product decision: non-organization users default to patient context.
        return 'patient';
    }

    private hasAnyRole(roles: string[], expected: string[]): boolean {
        const accepted = new Set(expected);
        return roles.some((role) => accepted.has(role));
    }

    private getClaimAsString(user: Record<string, unknown> | undefined, key: string): string | undefined {
        const value = user?.[key];
        return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
    }
}
