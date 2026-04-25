import { registerAs } from '@nestjs/config';

/**
 * Configuración del cliente Medplum (servidor FHIR R4 autorizado).
 *
 * Variables de entorno requeridas:
 *   MEDPLUM_BASE_URL      — p.ej. https://api.medplum.com
 *   MEDPLUM_CLIENT_ID     — Client credentials OAuth2
 *   MEDPLUM_CLIENT_SECRET — Client credentials OAuth2
 */
export default registerAs('medplum', () => ({
  baseUrl: process.env.MEDPLUM_BASE_URL ?? 'https://api.medplum.com',
  clientId: process.env.MEDPLUM_CLIENT_ID ?? '',
  clientSecret: process.env.MEDPLUM_CLIENT_SECRET ?? '',
  tokenTtlMs: 3_600_000, // 1 hora
}));
