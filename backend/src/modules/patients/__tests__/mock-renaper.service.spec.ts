import { NotFoundException } from '@nestjs/common';
import { MockRenaperService } from '../mock-renaper.service';
import { SexType } from '../../../common/enums/sex-type.enum';

describe('MockRenaperService', () => {
  let service: MockRenaperService;

  beforeEach(() => {
    service = new MockRenaperService();
  });

  describe('lookup()', () => {
    it('returns verified identity for known DNI + sex combination', async () => {
      const result = await service.lookup('12345678', SexType.M);

      expect(result).toMatchObject({
        firstName: 'Juan',
        lastName: 'Pérez',
        birthDate: '1985-03-15',
        verified: true,
      });
      expect(result.photoUrl).toBeTruthy();
    });

    it('returns correct data for female patient', async () => {
      const result = await service.lookup('87654321', SexType.F);

      expect(result).toMatchObject({
        firstName: 'María',
        lastName: 'González',
        verified: true,
      });
    });

    it('returns correct data for non-binary patient (X)', async () => {
      const result = await service.lookup('99887766', SexType.X);

      expect(result).toMatchObject({
        firstName: 'Alex',
        lastName: 'López',
        verified: true,
      });
    });

    it('throws NotFoundException for unknown DNI', async () => {
      await expect(service.lookup('00000000', SexType.M)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when correct DNI used with wrong sex', async () => {
      // 12345678 is male — using female should not find it
      await expect(service.lookup('12345678', SexType.F)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('error message includes the DNI and sex for debugging', async () => {
      await expect(service.lookup('99999999', SexType.M)).rejects.toThrow(
        /DNI 99999999/,
      );
    });
  });

  describe('exists()', () => {
    it('returns true for known combination', async () => {
      const result = await service.exists('12345678', SexType.M);
      expect(result).toBe(true);
    });

    it('returns false for unknown DNI', async () => {
      const result = await service.exists('00000000', SexType.M);
      expect(result).toBe(false);
    });

    it('returns false for mismatched sex', async () => {
      const result = await service.exists('12345678', SexType.F);
      expect(result).toBe(false);
    });
  });
});
