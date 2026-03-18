import { ConflictException, NotFoundException } from '@nestjs/common';
import { PatientsService } from '../patients.service';
import { MockRenaperService } from '../mock-renaper.service';
import { SexType } from '../../../common/enums/sex-type.enum';

describe('PatientsService', () => {
  let patientsService: PatientsService;
  let mockRenaperService: MockRenaperService;
  let mockPatientRepo: any;

  beforeEach(() => {
    mockRenaperService = new MockRenaperService();

    mockPatientRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'new-uuid', ...entity })),
      findAndCount: jest.fn(),
    };

    patientsService = new PatientsService(
      mockPatientRepo,
      mockRenaperService,
    );
  });

  describe('create()', () => {
    it('creates a patient with RENAPER-verified identity', async () => {
      mockPatientRepo.findOne.mockResolvedValue(null); // no existing patient

      const patient = await patientsService.create({
        dni: '12345678',
        sex: SexType.M,
        email: 'juan@example.com',
      });

      expect(patient.firstName).toBe('Juan');
      expect(patient.lastName).toBe('Pérez');
      expect(patient.identityVerified).toBe(true);
    });

    it('throws ConflictException if DNI already registered', async () => {
      mockPatientRepo.findOne.mockResolvedValue({ id: 'existing-uuid', dni: '12345678' });

      await expect(
        patientsService.create({ dni: '12345678', sex: SexType.M }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException if RENAPER does not find the identity', async () => {
      mockPatientRepo.findOne.mockResolvedValue(null);

      await expect(
        patientsService.create({ dni: '99999999', sex: SexType.M }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('blocks updating identity fields after verification', async () => {
      const existingPatient = {
        id: 'uuid-1',
        identityVerified: true,
        firstName: 'Juan',
        lastName: 'Pérez',
        birthDate: '1985-03-15',
        email: 'old@example.com',
      };

      mockPatientRepo.findOne.mockResolvedValue(existingPatient);
      mockPatientRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const result = await patientsService.update('uuid-1', {
        email: 'new@example.com',
        firstName: 'Hacker',  // should be ignored
        lastName: 'Attack',   // should be ignored
      } as any);

      // Identity fields should remain unchanged
      expect(result.firstName).toBe('Juan');
      expect(result.lastName).toBe('Pérez');
      // Contact fields should be updated
      expect(result.email).toBe('new@example.com');
    });
  });
});
