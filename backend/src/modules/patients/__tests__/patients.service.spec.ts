import { ConflictException, NotFoundException } from '@nestjs/common';
import { PatientsService } from '../patients.service';
import { MockRenaperService } from '../mock-renaper.service';
import { SexType } from '../../../common/enums/sex-type.enum';

describe('PatientsService', () => {
  let patientsService: PatientsService;
  let mockRenaperService: MockRenaperService;
  let mockPatientRepo: any;
  let previousBypassFlag: string | undefined;

  beforeEach(() => {
    previousBypassFlag = process.env.DEV_BYPASS_PATIENT_IDENTITY_VALIDATION;
    process.env.DEV_BYPASS_PATIENT_IDENTITY_VALIDATION = 'false';

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

  afterEach(() => {
    if (previousBypassFlag === undefined) {
      delete process.env.DEV_BYPASS_PATIENT_IDENTITY_VALIDATION;
      return;
    }

    process.env.DEV_BYPASS_PATIENT_IDENTITY_VALIDATION = previousBypassFlag;
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

    it('creates a patient with manually provided identity and does not call RENAPER', async () => {
      mockPatientRepo.findOne.mockResolvedValue(null);
      const renaperSpy = jest.spyOn(mockRenaperService, 'lookup');

      const patient = await patientsService.create({
        dni: '32123456',
        sex: SexType.F,
        firstName: 'Lucia',
        lastName: 'Sosa',
        birthDate: '1992-10-18',
        physicalDniVerified: true,
        phone: '111111111',
      });

      expect(patient.firstName).toBe('Lucia');
      expect(patient.lastName).toBe('Sosa');
      expect(patient.birthDate).toBe('1992-10-18');
      expect(patient.identityVerified).toBe(true);
      expect(renaperSpy).not.toHaveBeenCalled();
    });

    it('falls back to RENAPER when identity data is incomplete', async () => {
      mockPatientRepo.findOne.mockResolvedValue(null);
      const renaperSpy = jest.spyOn(mockRenaperService, 'lookup');

      const patient = await patientsService.create({
        dni: '12345678',
        sex: SexType.M,
        firstName: 'Nombre Incompleto',
      });

      expect(patient.firstName).toBe('Juan');
      expect(patient.lastName).toBe('Pérez');
      expect(patient.identityVerified).toBe(true);
      expect(renaperSpy).toHaveBeenCalledWith('12345678', SexType.M);
    });

    it('marks identity as unverified when manual registration does not include physical verification', async () => {
      mockPatientRepo.findOne.mockResolvedValue(null);

      const patient = await patientsService.create({
        dni: '30333444',
        sex: SexType.F,
        firstName: 'Paula',
        lastName: 'Mendez',
        birthDate: '1994-04-11',
      });

      expect(patient.identityVerified).toBe(false);
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

  describe('findAll()', () => {
    it('returns paginated patients and forwards paging args to repository', async () => {
      const orderedPatients = [
        { id: '1', lastName: 'Alonso', firstName: 'Ana' },
        { id: '2', lastName: 'Bravo', firstName: 'Bruno' },
      ];

      mockPatientRepo.findAndCount.mockResolvedValue([orderedPatients, 32]);

      const result = await patientsService.findAll(2, 20);

      expect(mockPatientRepo.findAndCount).toHaveBeenCalledWith({
        skip: 20,
        take: 20,
        order: { lastName: 'ASC', firstName: 'ASC' },
      });
      expect(result).toEqual({
        data: orderedPatients,
        total: 32,
        page: 2,
        limit: 20,
      });
    });
  });
});
