import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ProfessionalsService } from '../professionals.service';
import { MockSisaService } from '../mock-sisa.service';

describe('ProfessionalsService', () => {
  let professionalsService: ProfessionalsService;
  let mockSisaService: MockSisaService;
  let mockProfessionalRepo: any;

  beforeEach(() => {
    mockSisaService = new MockSisaService();

    mockProfessionalRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) =>
        Promise.resolve({ id: 'new-uuid', ...entity }),
      ),
      findAndCount: jest.fn(),
    };

    professionalsService = new ProfessionalsService(
      mockProfessionalRepo,
      mockSisaService,
    );
  });

  describe('create()', () => {
    it('creates a professional with SISA-verified license data', async () => {
      mockProfessionalRepo.findOne.mockResolvedValue(null);

      const professional = await professionalsService.create({
        tenantId: 'tenant-uuid',
        userId: 'user-uuid',
        licenseNumber: 'MN-12345',
      });

      expect(professional.specialty).toBe('Medicina General');
      expect(professional.professionalType).toBe('Médico');
      expect(professional.sisaVerified).toBe(true);
    });

    it('throws ConflictException if license number is already registered', async () => {
      mockProfessionalRepo.findOne.mockResolvedValue({
        id: 'existing-uuid',
        licenseNumber: 'MN-12345',
      });

      await expect(
        professionalsService.create({
          tenantId: 'tenant-uuid',
          userId: 'user-uuid',
          licenseNumber: 'MN-12345',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException if SISA does not find the license', async () => {
      mockProfessionalRepo.findOne.mockResolvedValue(null);

      await expect(
        professionalsService.create({
          tenantId: 'tenant-uuid',
          userId: 'user-uuid',
          licenseNumber: 'MN-99999',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if the license is SUSPENDIDO', async () => {
      mockProfessionalRepo.findOne.mockResolvedValue(null);

      await expect(
        professionalsService.create({
          tenantId: 'tenant-uuid',
          userId: 'user-uuid',
          licenseNumber: 'MN-55555',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyLicense()', () => {
    it('returns SISA data for a valid license without creating a record', async () => {
      const result = await professionalsService.verifyLicense('MN-67890');

      expect(result).toMatchObject({
        firstName: 'Lucía',
        lastName: 'Ramírez',
        specialty: 'Pediatría',
        verified: true,
      });
      // Ensure no save was called
      expect(mockProfessionalRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown license', async () => {
      await expect(
        professionalsService.verifyLicense('MN-00000'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
