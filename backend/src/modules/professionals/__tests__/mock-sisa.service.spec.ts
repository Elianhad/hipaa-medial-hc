import { NotFoundException } from '@nestjs/common';
import { MockSisaService } from '../mock-sisa.service';

describe('MockSisaService', () => {
  let service: MockSisaService;

  beforeEach(() => {
    service = new MockSisaService();
  });

  describe('lookup()', () => {
    it('returns verified license data for a known active license', async () => {
      const result = await service.lookup('MN-12345');

      expect(result).toMatchObject({
        firstName: 'Roberto',
        lastName: 'Fernández',
        specialty: 'Medicina General',
        professionalType: 'Médico',
        licenseStatus: 'ACTIVO',
        verified: true,
      });
    });

    it('returns correct data for a nurse professional', async () => {
      const result = await service.lookup('MN-22222');

      expect(result).toMatchObject({
        firstName: 'Gabriela',
        lastName: 'Sánchez',
        specialty: 'Enfermería Clínica',
        professionalType: 'Enfermero/a',
        licenseStatus: 'ACTIVO',
        verified: true,
      });
    });

    it('returns correct data for a suspended license', async () => {
      const result = await service.lookup('MN-55555');

      expect(result).toMatchObject({
        firstName: 'Jorge',
        lastName: 'Herrera',
        licenseStatus: 'SUSPENDIDO',
        verified: true,
      });
    });

    it('throws NotFoundException for unknown license number', async () => {
      await expect(service.lookup('MN-99999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('error message includes the license number for debugging', async () => {
      await expect(service.lookup('MN-00000')).rejects.toThrow(
        /MN-00000/,
      );
    });
  });

  describe('isActive()', () => {
    it('returns true for a known active license', async () => {
      const result = await service.isActive('MN-12345');
      expect(result).toBe(true);
    });

    it('returns false for an unknown license', async () => {
      const result = await service.isActive('MN-99999');
      expect(result).toBe(false);
    });

    it('returns false for a suspended license', async () => {
      const result = await service.isActive('MN-55555');
      expect(result).toBe(false);
    });
  });
});
