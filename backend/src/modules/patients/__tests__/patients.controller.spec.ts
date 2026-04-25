import { Test, TestingModule } from '@nestjs/testing';
import { PatientsController } from '../patients.controller';
import { PatientsService } from '../patients.service';
import { SexType } from '../../../common/enums/sex-type.enum';

describe('PatientsController', () => {
  let controller: PatientsController;
  let service: {
    findAll: jest.Mock;
    findById: jest.Mock;
    verifyIdentity: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findById: jest.fn(),
      verifyIdentity: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientsController],
      providers: [
        {
          provide: PatientsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<PatientsController>(PatientsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll()', () => {
    it('parses page/limit query params and returns paginated contract', async () => {
      const payload = {
        data: [{ id: 'p-1', firstName: 'Ana', lastName: 'Alonso', dni: '30111222' }],
        total: 42,
        page: 2,
        limit: 20,
      };
      service.findAll.mockResolvedValue(payload);

      const result = await controller.findAll('2', '20');

      expect(service.findAll).toHaveBeenCalledWith(2, 20);
      expect(result).toEqual(payload);
    });

    it('uses default pagination values when query params are omitted', async () => {
      service.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('create()', () => {
    it('delegates patient registration to service for manual/scanned flow payloads', async () => {
      const dto = {
        dni: '32123456',
        sex: SexType.F,
        firstName: 'Lucia',
        lastName: 'Sosa',
        birthDate: '1992-10-18',
        physicalDniVerified: true,
      };
      const created = { id: 'patient-new-1', ...dto, identityVerified: true };
      service.create.mockResolvedValue(created);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });
  });

  describe('findOne()', () => {
    it('returns a patient by id', async () => {
      service.findById.mockResolvedValue({ id: 'patient-1', dni: '30111222' });

      const result = await controller.findOne('patient-1');

      expect(service.findById).toHaveBeenCalledWith('patient-1');
      expect(result).toEqual({ id: 'patient-1', dni: '30111222' });
    });
  });

  describe('verifyIdentity()', () => {
    it('delegates RENAPER preview lookup', async () => {
      const preview = {
        firstName: 'Juan',
        lastName: 'Pérez',
        birthDate: '1985-03-15',
        photoUrl: 'https://example.org/photo.png',
        verified: true,
      };
      service.verifyIdentity.mockResolvedValue(preview);

      const result = await controller.verifyIdentity('12345678', SexType.M);

      expect(service.verifyIdentity).toHaveBeenCalledWith('12345678', SexType.M);
      expect(result).toEqual(preview);
    });
  });

  describe('update()', () => {
    it('delegates patient update to service', async () => {
      const dto = { phone: '1122334455', email: 'nuevo@example.com' };
      const updated = { id: 'patient-1', ...dto };
      service.update.mockResolvedValue(updated);

      const result = await controller.update('patient-1', dto);

      expect(service.update).toHaveBeenCalledWith('patient-1', dto);
      expect(result).toEqual(updated);
    });
  });
});
