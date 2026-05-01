import { ConflictException, NotFoundException } from '@nestjs/common';
import { PatientsService } from '../patients.service';
import { MockRenaperService } from '../mock-renaper.service';
import { SexType } from '../../../common/enums/sex-type.enum';
import { FhirService } from '../../fhir/fhir.service';

describe('PatientsService', () => {
  let patientsService: PatientsService;
  let mockRenaperService: MockRenaperService;
  let mockPatientRepo: any;
  let mockFhirService: Partial<FhirService>;
  let previousBypassFlag: string | undefined;

  beforeEach(() => {
    previousBypassFlag = process.env.DEV_BYPASS_PATIENT_IDENTITY_VALIDATION;
    process.env.DEV_BYPASS_PATIENT_IDENTITY_VALIDATION = 'false';

    mockRenaperService = new MockRenaperService();

    mockPatientRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'new-uuid', ...entity })),
      update: jest.fn().mockResolvedValue(undefined),
      findAndCount: jest.fn(),
    };

    mockFhirService = {
      isConfigured: jest.fn().mockReturnValue(false),
      upsertPatient: jest.fn().mockResolvedValue('fhir-patient-001'),
    };

    patientsService = new PatientsService(
      mockPatientRepo,
      mockRenaperService,
      mockFhirService as FhirService,
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

    it('calls upsertPatient after create when FHIR is configured', async () => {
      (mockFhirService.isConfigured as jest.Mock).mockReturnValue(true);
      mockPatientRepo.findOne.mockResolvedValue(null);

      const patient = await patientsService.create({
        dni: '12345678',
        sex: SexType.M,
        email: 'juan@example.com',
      });

      // Allow the fire-and-forget promise to resolve
      await new Promise(process.nextTick);

      expect(mockFhirService.upsertPatient).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: patient.id,
          dni: '12345678',
          sex: 'male',
        }),
      );
      expect(mockPatientRepo.update).toHaveBeenCalledWith(
        { id: patient.id },
        { fhirId: 'fhir-patient-001' },
      );
    });

    it('does NOT call upsertPatient when FHIR is not configured', async () => {
      (mockFhirService.isConfigured as jest.Mock).mockReturnValue(false);
      mockPatientRepo.findOne.mockResolvedValue(null);

      await patientsService.create({ dni: '12345678', sex: SexType.M });
      await new Promise(process.nextTick);

      expect(mockFhirService.upsertPatient).not.toHaveBeenCalled();
    });

    it('persists patient locally even when Medplum throws', async () => {
      (mockFhirService.isConfigured as jest.Mock).mockReturnValue(true);
      (mockFhirService.upsertPatient as jest.Mock).mockRejectedValueOnce(
        new Error('Medplum unavailable'),
      );
      mockPatientRepo.findOne.mockResolvedValue(null);

      // create() must resolve without throwing
      const patient = await patientsService.create({
        dni: '12345678',
        sex: SexType.M,
      });

      // Allow fire-and-forget to settle
      await new Promise(process.nextTick);

      expect(patient.id).toBeTruthy();
      // fhirId should NOT be set because sync failed
      expect(mockPatientRepo.update).not.toHaveBeenCalledWith(
        { id: patient.id },
        expect.objectContaining({ fhirId: expect.any(String) }),
      );
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

    it('calls upsertPatient after update when FHIR is configured', async () => {
      (mockFhirService.isConfigured as jest.Mock).mockReturnValue(true);
      const existingPatient = {
        id: 'uuid-1',
        dni: '12345678',
        sex: SexType.F,
        firstName: 'Ana',
        lastName: 'Gómez',
        birthDate: '1990-05-20',
        email: 'old@example.com',
        identityVerified: false,
        fhirId: 'fhir-existing-001',
      };

      mockPatientRepo.findOne.mockResolvedValue(existingPatient);
      mockPatientRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      await patientsService.update('uuid-1', { email: 'new@example.com' } as any);
      await new Promise(process.nextTick);

      expect(mockFhirService.upsertPatient).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'uuid-1',
          fhirId: 'fhir-existing-001',
          sex: 'female',
        }),
      );
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
