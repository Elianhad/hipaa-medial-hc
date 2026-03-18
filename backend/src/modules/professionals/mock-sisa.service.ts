import { Injectable, NotFoundException } from '@nestjs/common';

export interface SisaLicenseData {
  firstName: string;
  lastName: string;
  specialty: string;
  professionalType: string;
  licenseStatus: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';
  verified: boolean;
}

/**
 * MockSisaService
 *
 * Simulates a call to SISA (Sistema Integrado de Información Sanitaria
 * Argentino) — the Argentine Ministry of Health's registry for healthcare
 * professionals.
 *
 * Given a license number (matrícula) it returns verified professional data:
 *   firstName, lastName, specialty, professionalType, and licenseStatus.
 *
 * IMPORTANT: In production, replace the `lookup()` method with an actual
 * HTTP call to the SISA REST API:
 *   https://sisa.msal.gov.ar/sisa/services/rest/establecimiento/obtenerProfesional
 * The returned data must be treated as authoritative and client-side fields
 * should be set to READ-ONLY once the license is verified.
 *
 * Mock data is seeded in the MOCK_DATABASE map below.
 */
@Injectable()
export class MockSisaService {
  // -------------------------------------------------------------------
  // Simulated SISA database — replace with real API call in prod
  // Key: licenseNumber (matrícula nacional)
  // -------------------------------------------------------------------
  private static readonly MOCK_DATABASE: Record<
    string,
    Omit<SisaLicenseData, 'verified'>
  > = {
    'MN-12345': {
      firstName: 'Roberto',
      lastName: 'Fernández',
      specialty: 'Medicina General',
      professionalType: 'Médico',
      licenseStatus: 'ACTIVO',
    },
    'MN-67890': {
      firstName: 'Lucía',
      lastName: 'Ramírez',
      specialty: 'Pediatría',
      professionalType: 'Médico',
      licenseStatus: 'ACTIVO',
    },
    'MN-11111': {
      firstName: 'Martín',
      lastName: 'Torres',
      specialty: 'Cardiología',
      professionalType: 'Médico',
      licenseStatus: 'ACTIVO',
    },
    'MN-22222': {
      firstName: 'Gabriela',
      lastName: 'Sánchez',
      specialty: 'Enfermería Clínica',
      professionalType: 'Enfermero/a',
      licenseStatus: 'ACTIVO',
    },
    'MN-33333': {
      firstName: 'Diego',
      lastName: 'Morales',
      specialty: 'Kinesiología',
      professionalType: 'Kinesiólogo/a',
      licenseStatus: 'ACTIVO',
    },
    'MN-44444': {
      firstName: 'Valeria',
      lastName: 'Castro',
      specialty: 'Psicología Clínica',
      professionalType: 'Psicólogo/a',
      licenseStatus: 'ACTIVO',
    },
    'MN-55555': {
      firstName: 'Jorge',
      lastName: 'Herrera',
      specialty: 'Odontología General',
      professionalType: 'Odontólogo/a',
      licenseStatus: 'SUSPENDIDO',
    },
  };

  /**
   * Look up professional license data from the mock SISA database.
   *
   * @param licenseNumber  License number (matrícula nacional)
   * @returns              Verified professional data — firstName, lastName,
   *                       specialty, professionalType, licenseStatus
   * @throws NotFoundException    when the license number is not found
   * @throws ConflictException-style error when the license is not ACTIVO
   */
  async lookup(licenseNumber: string): Promise<SisaLicenseData> {
    const record = MockSisaService.MOCK_DATABASE[licenseNumber];

    if (!record) {
      throw new NotFoundException(
        `SISA: No se encontró la matrícula ${licenseNumber}. ` +
          `Verifique el número ingresado.`,
      );
    }

    // Simulate network latency of a real API call (200–400 ms)
    await this.simulateLatency(200, 400);

    return { ...record, verified: true };
  }

  /**
   * Checks whether a license number exists and is active in the registry.
   * Returns `false` instead of throwing when not found (useful for validation).
   */
  async isActive(licenseNumber: string): Promise<boolean> {
    const record = MockSisaService.MOCK_DATABASE[licenseNumber];
    await this.simulateLatency(100, 200);
    return record?.licenseStatus === 'ACTIVO';
  }

  // -------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------

  private simulateLatency(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
