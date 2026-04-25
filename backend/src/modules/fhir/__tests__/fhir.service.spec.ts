import {
  FhirService,
  FhirEvolutionInput,
  FhirOrderInput,
  FhirPatientInput,
  FhirProblemInput,
} from '../fhir.service';

describe('FhirService — resource builders', () => {
  let service: FhirService;

  beforeEach(() => {
    service = new FhirService(
      { request: jest.fn() } as any,
      { get: jest.fn().mockReturnValue('us-east-1') } as any,
    );
  });

  describe('buildPatientResource()', () => {
    const input: FhirPatientInput = {
      patientId: 'a3b8c12d-0001',
      dni: '12345678',
      firstName: 'Juan',
      lastName: 'Pérez',
      birthDate: '1985-03-15',
      sex: 'male',
      email: 'juan@example.com',
      phone: '+5491111111111',
    };

    it('returns resourceType Patient', () => {
      const resource = service.buildPatientResource(input);
      expect(resource.resourceType).toBe('Patient');
    });

    it('includes DNI as official identifier', () => {
      const resource = service.buildPatientResource(input);
      const identifier = resource.identifier.find(
        (entry: any) => entry.system === 'urn:oid:2.16.840.1.113883.4.330.32',
      );
      expect(identifier).toBeDefined();
      expect(identifier!.value).toBe('12345678');
    });
  });

  describe('mapProblemStatusToConditionClinicalStatus()', () => {
    it('passes through FHIR-aligned status codes', () => {
      const status = service.mapProblemStatusToConditionClinicalStatus('recurrence');
      expect(status.coding[0].code).toBe('recurrence');
    });
  });

  describe('buildProblemConditionResource()', () => {
    const input: FhirProblemInput = {
      patientFhirId: 'patient-uuid-001',
      practitionerFhirId: 'prof-uuid-001',
      encounterId: 'enc-001',
      tenantId: 'tenant-uuid-001',
      title: 'Diabetes mellitus tipo 2',
      clinicalStatus: 'active',
      category: 'problem-list-item',
      snomedCode: '44054006',
      snomedDisplay: 'Diabetes mellitus type 2',
      icd10Code: 'E11.9',
      icd10Display: 'Type 2 diabetes mellitus without complications',
    };

    it('returns resourceType Condition', () => {
      const resource = service.buildProblemConditionResource(input);
      expect(resource.resourceType).toBe('Condition');
    });

    it('includes SNOMED and ICD-10 codings', () => {
      const resource = service.buildProblemConditionResource(input);
      expect(resource.code.coding).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ system: 'http://snomed.info/sct', code: '44054006' }),
          expect.objectContaining({ system: 'http://hl7.org/fhir/sid/icd-10', code: 'E11.9' }),
        ]),
      );
    });

    it('maps category and clinical status', () => {
      const resource = service.buildProblemConditionResource(input);
      expect(resource.category[0].coding[0].code).toBe('problem-list-item');
      expect(resource.clinicalStatus.coding[0].code).toBe('active');
    });
  });

  describe('buildEncounterResource()', () => {
    const input: FhirEvolutionInput = {
      patientFhirId: 'patient-uuid-001',
      practitionerFhirId: 'prof-uuid-001',
      tenantId: 'tenant-uuid-001',
      evolutionDate: '2026-03-18T10:30:00-03:00',
      problemFhirId: 'condition-001',
      subjective: 'Paciente refiere dolor…',
    };

    it('includes encounter diagnosis when a problem exists', () => {
      const resource = service.buildEncounterResource(input);
      expect(resource.diagnosis?.[0].condition.reference).toBe('Condition/condition-001');
    });
  });

  describe('buildClinicalImpressionResource()', () => {
    const input: FhirEvolutionInput = {
      patientFhirId: 'patient-uuid-001',
      practitionerFhirId: 'prof-uuid-001',
      tenantId: 'tenant-uuid-001',
      evolutionDate: '2026-03-18T10:30:00-03:00',
      problemFhirId: 'condition-001',
      subjective: 'Tos productiva de 3 días',
      objective: 'Crepitantes basales derechos',
      assessment: 'Sospecha de neumonía',
      plan: 'Inicia amoxicilina',
      trend: 'worsening',
    };

    it('returns ClinicalImpression linked to the problem', () => {
      const resource = service.buildClinicalImpressionResource(input, 'enc-001');
      expect(resource.resourceType).toBe('ClinicalImpression');
      expect(resource.problem?.[0].reference).toBe('Condition/condition-001');
    });
  });

  describe('buildObservationResource()', () => {
    const input: FhirEvolutionInput = {
      patientFhirId: 'patient-uuid-001',
      practitionerFhirId: 'prof-uuid-001',
      tenantId: 'tenant-uuid-001',
      evolutionDate: '2026-03-18T10:30:00-03:00',
      problemFhirId: 'condition-001',
    };

    const section = {
      code: '11336-5',
      display: 'History of chief complaint Narrative',
      value: 'Paciente refiere dolor de cabeza',
    };

    it('keeps observation focused on the problem thread', () => {
      const resource = service.buildObservationResource(input, 'enc-001', section);
      expect(resource.focus?.[0].reference).toBe('Condition/condition-001');
    });
  });

  describe('buildTrendObservationResource()', () => {
    const input: FhirEvolutionInput = {
      patientFhirId: 'patient-uuid-001',
      practitionerFhirId: 'prof-uuid-001',
      tenantId: 'tenant-uuid-001',
      evolutionDate: '2026-03-18T10:30:00-03:00',
      problemFhirId: 'condition-001',
      trend: 'improving',
    };

    it('persists both coded trend and numeric score', () => {
      const resource = service.buildTrendObservationResource(input, 'enc-001');
      expect(resource.valueCodeableConcept?.coding[0].code).toBe('improving');
      expect(resource.component?.[0].valueInteger).toBe(1);
    });
  });

  describe('buildOrderResource()', () => {
    const medicationInput: FhirOrderInput = {
      orderId: 'order-001',
      patientFhirId: 'patient-uuid-001',
      practitionerFhirId: 'prof-uuid-001',
      encounterId: 'enc-001',
      problemFhirId: 'condition-001',
      tenantId: 'tenant-uuid-001',
      authoredOn: '2026-03-18T10:30:00-03:00',
      type: 'medication',
      detail: 'Amoxicilina 500 mg cada 8 horas por 7 días',
      medicationDisplay: 'Amoxicilina 500 mg cápsulas',
    };

    it('maps medication orders to MedicationRequest', () => {
      const resource = service.buildOrderResource(medicationInput);
      expect(resource.resourceType).toBe('MedicationRequest');
      expect(resource.reasonReference?.[0].reference).toBe('Condition/condition-001');
    });

    it('maps study orders to ServiceRequest', () => {
      const resource = service.buildServiceRequestResource({
        ...medicationInput,
        type: 'laboratory',
        detail: 'Hemograma completo',
        serviceCode: '57021-8',
        serviceDisplay: 'CBC panel',
      });
      expect(resource.resourceType).toBe('ServiceRequest');
      expect(resource.code.coding[0].code).toBe('57021-8');
    });
  });
});
