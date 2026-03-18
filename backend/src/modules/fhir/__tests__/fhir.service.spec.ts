import { FhirService, FhirEvolutionInput, FhirPatientInput } from '../fhir.service';

// We test the resource builders directly — no HTTP needed
describe('FhirService — resource builders', () => {
  let service: FhirService;

  beforeEach(() => {
    // Create service with mocked dependencies
    service = new FhirService(
      { request: jest.fn() } as any,
      { get: jest.fn().mockReturnValue('us-east-1') } as any,
    );
  });

  // ---------------------------------------------------------------------------
  // Patient resource
  // ---------------------------------------------------------------------------
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
        (i: any) => i.system === 'urn:oid:2.16.840.1.113883.4.330.32',
      );
      expect(identifier).toBeDefined();
      expect(identifier!.value).toBe('12345678');
    });

    it('sets gender correctly', () => {
      const resource = service.buildPatientResource(input);
      expect(resource.gender).toBe('male');
    });

    it('includes email and phone in telecom', () => {
      const resource = service.buildPatientResource(input);
      const emailEntry = resource.telecom.find((t: any) => t.system === 'email');
      const phoneEntry = resource.telecom.find((t: any) => t.system === 'phone');
      expect(emailEntry?.value).toBe('juan@example.com');
      expect(phoneEntry?.value).toBe('+5491111111111');
    });
  });

  // ---------------------------------------------------------------------------
  // Encounter resource
  // ---------------------------------------------------------------------------
  describe('buildEncounterResource()', () => {
    const input: FhirEvolutionInput = {
      patientFhirId: 'patient-uuid-001',
      practitionerFhirId: 'prof-uuid-001',
      tenantId: 'tenant-uuid-001',
      evolutionDate: '2026-03-18T10:30:00-03:00',
      subjective: 'Paciente refiere dolor…',
      assessment: 'Neumonía J18.9',
      plan: 'Antibiótico + reposo',
    };

    it('returns resourceType Encounter', () => {
      const resource = service.buildEncounterResource(input);
      expect(resource.resourceType).toBe('Encounter');
    });

    it('has status finished', () => {
      const resource = service.buildEncounterResource(input);
      expect(resource.status).toBe('finished');
    });

    it('references the correct patient', () => {
      const resource = service.buildEncounterResource(input);
      expect(resource.subject.reference).toBe('Patient/patient-uuid-001');
    });

    it('tags the resource with the tenant ID', () => {
      const resource = service.buildEncounterResource(input);
      const tag = resource.meta.tag.find(
        (t: any) => t.system === 'https://hipaa-hce/tenant',
      );
      expect(tag?.code).toBe('tenant-uuid-001');
    });
  });

  // ---------------------------------------------------------------------------
  // Condition resource
  // ---------------------------------------------------------------------------
  describe('buildConditionResource()', () => {
    const input: FhirEvolutionInput = {
      patientFhirId: 'patient-uuid-001',
      practitionerFhirId: 'prof-uuid-001',
      tenantId: 'tenant-uuid-001',
      evolutionDate: '2026-03-18T10:30:00-03:00',
      icd10Code: 'J18.9',
      icd10Display: 'Pneumonia, unspecified organism',
      assessment: 'Neumonía adquirida en la comunidad',
    };

    it('returns resourceType Condition', () => {
      const resource = service.buildConditionResource(input, 'enc-001');
      expect(resource.resourceType).toBe('Condition');
    });

    it('includes ICD-10 code in coding', () => {
      const resource = service.buildConditionResource(input, 'enc-001');
      const coding = resource.code.coding[0];
      expect(coding.system).toBe('http://hl7.org/fhir/sid/icd-10');
      expect(coding.code).toBe('J18.9');
    });

    it('links to the encounter', () => {
      const resource = service.buildConditionResource(input, 'enc-001');
      expect(resource.encounter.reference).toBe('Encounter/enc-001');
    });

    it('includes problem reference extension when problemFhirId is provided', () => {
      const inputWithProblem = { ...input, problemFhirId: 'existing-problem-abc' };
      const resource = service.buildConditionResource(inputWithProblem, 'enc-001');
      expect(resource.extension).toBeDefined();
      expect(resource.extension![0].valueReference.reference).toContain(
        'existing-problem-abc',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Observation resource
  // ---------------------------------------------------------------------------
  describe('buildObservationResource()', () => {
    const input: FhirEvolutionInput = {
      patientFhirId: 'patient-uuid-001',
      practitionerFhirId: 'prof-uuid-001',
      tenantId: 'tenant-uuid-001',
      evolutionDate: '2026-03-18T10:30:00-03:00',
    };

    const section = {
      code: '11336-5',
      display: 'History of chief complaint Narrative',
      value: 'Paciente refiere dolor de cabeza',
    };

    it('returns resourceType Observation', () => {
      const resource = service.buildObservationResource(input, 'enc-001', section);
      expect(resource.resourceType).toBe('Observation');
    });

    it('uses LOINC coding', () => {
      const resource = service.buildObservationResource(input, 'enc-001', section);
      const coding = resource.code.coding[0];
      expect(coding.system).toBe('http://loinc.org');
      expect(coding.code).toBe('11336-5');
    });

    it('includes the narrative value as valueString', () => {
      const resource = service.buildObservationResource(input, 'enc-001', section);
      expect(resource.valueString).toBe('Paciente refiere dolor de cabeza');
    });
  });
});
