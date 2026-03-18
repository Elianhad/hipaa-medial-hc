import { Injectable, NotFoundException } from '@nestjs/common';
import { SexType } from '../../common/enums/sex-type.enum';

export interface RenaperIdentityData {
  firstName: string;
  lastName: string;
  birthDate: string;   // ISO-8601 date string (YYYY-MM-DD)
  photoUrl: string;
  verified: boolean;
}

/**
 * MockRENAPERService
 *
 * Simulates a call to the Argentine RENAPER (Registro Nacional de las Personas)
 * governmental identity API.
 *
 * Given a DNI + sex combination it returns verified personal data:
 *   firstName, lastName, birthDate, and a placeholder photo URL.
 *
 * IMPORTANT: In production, replace the `lookup()` method with an actual
 * HTTP call to the RENAPER REST API (or equivalent governmental endpoint).
 * The returned data must be treated as authoritative and client-side fields
 * should be set to READ-ONLY once identity is verified.
 *
 * Mock data is seeded in the MOCK_DATABASE map below.
 */
@Injectable()
export class MockRenaperService {
  // -------------------------------------------------------------------
  // Simulated government database — replace with real API call in prod
  // -------------------------------------------------------------------
  private static readonly MOCK_DATABASE: Record<
    string,
    Omit<RenaperIdentityData, 'verified'>
  > = {
    // key: `${dni}-${sex}`
    '12345678-M': {
      firstName: 'Juan',
      lastName: 'Pérez',
      birthDate: '1985-03-15',
      photoUrl:
        'https://via.placeholder.com/200x200.png?text=DNI+12345678',
    },
    '87654321-F': {
      firstName: 'María',
      lastName: 'González',
      birthDate: '1992-07-22',
      photoUrl:
        'https://via.placeholder.com/200x200.png?text=DNI+87654321',
    },
    '11223344-M': {
      firstName: 'Carlos',
      lastName: 'Rodríguez',
      birthDate: '1978-11-05',
      photoUrl:
        'https://via.placeholder.com/200x200.png?text=DNI+11223344',
    },
    '55667788-F': {
      firstName: 'Ana',
      lastName: 'Martínez',
      birthDate: '2000-01-30',
      photoUrl:
        'https://via.placeholder.com/200x200.png?text=DNI+55667788',
    },
    '99887766-X': {
      firstName: 'Alex',
      lastName: 'López',
      birthDate: '1995-06-10',
      photoUrl:
        'https://via.placeholder.com/200x200.png?text=DNI+99887766',
    },
  };

  /**
   * Look up identity data from the mock RENAPER database.
   *
   * @param dni  Document number (DNI)
   * @param sex  Sex as registered (M / F / X)
   * @returns    Verified identity data — firstName, lastName, birthDate, photoUrl
   * @throws     NotFoundException when the DNI + sex combination is not found
   */
  async lookup(dni: string, sex: SexType): Promise<RenaperIdentityData> {
    const key = `${dni}-${sex}`;
    const record = MockRenaperService.MOCK_DATABASE[key];

    if (!record) {
      throw new NotFoundException(
        `RENAPER: No se encontró el DNI ${dni} con sexo ${sex}. ` +
          `Verifique los datos ingresados.`,
      );
    }

    // Simulate network latency of a real API call (200–400 ms)
    await this.simulateLatency(200, 400);

    return { ...record, verified: true };
  }

  /**
   * Checks whether a DNI + sex combination exists in the registry.
   * Returns `false` instead of throwing when not found (useful for validation).
   */
  async exists(dni: string, sex: SexType): Promise<boolean> {
    const key = `${dni}-${sex}`;
    await this.simulateLatency(100, 200);
    return key in MockRenaperService.MOCK_DATABASE;
  }

  // -------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------

  private simulateLatency(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
