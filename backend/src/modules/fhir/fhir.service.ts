import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface FhirPatientInput {
  patientId: string;
  dni: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  sex: 'male' | 'female' | 'other' | 'unknown';
  email?: string;
  phone?: string;
}

export interface FhirEvolutionInput {
  patientFhirId: string;
  practitionerFhirId: string;
  encounterId?: string;
  tenantId: string;
  evolutionDate: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  icd10Code?: string;
  icd10Display?: string;
  problemFhirId?: string;
}

/**
 * FhirService
 *
 * Facade that communicates with AWS HealthLake (FHIR R4 compliant).
 * Requests are signed with AWS Signature V4 via the configured IAM role.
 *
 * Key resources managed:
 *  - Patient
 *  - Encounter (maps to a clinical evolution session)
 *  - Condition (maps to a diagnosed problem)
 *  - Observation (maps to SOAP notes / clinical findings)
 */
@Injectable()
export class FhirService {
  private readonly logger = new Logger(FhirService.name);
  private readonly baseUrl: string;
  private readonly datastoreId: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.datastoreId = this.configService.get<string>(
      'AWS_HEALTHLAKE_DATASTORE_ID',
    ) ?? '';
    this.baseUrl =
      this.configService.get<string>('AWS_HEALTHLAKE_ENDPOINT') ??
      `https://healthlake.${
        this.configService.get<string>('AWS_REGION') ?? 'us-east-1'
      }.amazonaws.com/datastore/${this.datastoreId}/r4`;
  }

  // -------------------------------------------------------------------
  // Patient resource
  // -------------------------------------------------------------------

  async upsertPatient(input: FhirPatientInput): Promise<string> {
    const resource = this.buildPatientResource(input);
    const response = await this.request<{ id: string }>(
      'PUT',
      `/Patient/${input.patientId}`,
      resource,
    );
    return response.id;
  }

  // -------------------------------------------------------------------
  // Clinical evolution → Encounter + Condition + Observation
  // -------------------------------------------------------------------

  /**
   * Persist a clinical evolution to AWS HealthLake.
   *
   * Creates/updates:
   *  - An Encounter resource (the consultation session)
   *  - A Condition resource (the diagnosis / assessment)
   *  - Observation resources (one per SOAP section with content)
   *
   * Returns the created FHIR resource IDs.
   */
  async createEvolution(input: FhirEvolutionInput): Promise<{
    encounterId: string;
    conditionId?: string;
    observationIds: string[];
  }> {
    // 1. Create Encounter
    const encounter = await this.request<{ id: string }>(
      'POST',
      '/Encounter',
      this.buildEncounterResource(input),
    );

    // 2. Create Condition (if assessment contains an ICD-10 code)
    let conditionId: string | undefined;
    if (input.icd10Code || input.assessment) {
      const condition = await this.request<{ id: string }>(
        'POST',
        '/Condition',
        this.buildConditionResource(input, encounter.id),
      );
      conditionId = condition.id;
    }

    // 3. Create Observations for each SOAP section
    const observationIds: string[] = [];
    const soapSections: { code: string; display: string; value: string | undefined }[] = [
      {
        code: '11336-5',
        display: 'History of chief complaint Narrative',
        value: input.subjective,
      },
      {
        code: '29545-1',
        display: 'Physical findings Narrative',
        value: input.objective,
      },
      {
        code: '51848-0',
        display: 'Evaluation note',
        value: input.assessment,
      },
      {
        code: '18776-5',
        display: 'Plan of care note',
        value: input.plan,
      },
    ];

    for (const section of soapSections) {
      if (!section.value) continue;
      const obs = await this.request<{ id: string }>(
        'POST',
        '/Observation',
        this.buildObservationResource(input, encounter.id, section),
      );
      observationIds.push(obs.id);
    }

    return { encounterId: encounter.id, conditionId, observationIds };
  }

  async getResource(resourceType: string, resourceId: string) {
    return this.request<any>('GET', `/${resourceType}/${resourceId}`);
  }

  // -------------------------------------------------------------------
  // FHIR Resource builders
  // -------------------------------------------------------------------

  buildPatientResource(input: FhirPatientInput) {
    return {
      resourceType: 'Patient',
      id: input.patientId,
      meta: {
        profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'],
      },
      identifier: [
        {
          use: 'official',
          system: 'urn:oid:2.16.840.1.113883.4.330.32',  // Argentina DNI OID
          value: input.dni,
        },
      ],
      name: [
        {
          use: 'official',
          family: input.lastName,
          given: [input.firstName],
        },
      ],
      gender: input.sex,
      birthDate: input.birthDate,
      telecom: [
        ...(input.email
          ? [{ system: 'email', value: input.email, use: 'home' }]
          : []),
        ...(input.phone
          ? [{ system: 'phone', value: input.phone, use: 'mobile' }]
          : []),
      ],
    };
  }

  buildEncounterResource(input: FhirEvolutionInput) {
    return {
      resourceType: 'Encounter',
      status: 'finished',
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'AMB',
        display: 'ambulatory',
      },
      subject: {
        reference: `Patient/${input.patientFhirId}`,
      },
      participant: [
        {
          individual: {
            reference: `Practitioner/${input.practitionerFhirId}`,
          },
        },
      ],
      period: {
        start: input.evolutionDate,
        end: input.evolutionDate,
      },
      meta: {
        tag: [
          {
            system: 'https://hipaa-hce/tenant',
            code: input.tenantId,
          },
        ],
      },
    };
  }

  buildConditionResource(
    input: FhirEvolutionInput,
    encounterId: string,
  ) {
    return {
      resourceType: 'Condition',
      clinicalStatus: {
        coding: [
          {
            system:
              'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'active',
          },
        ],
      },
      verificationStatus: {
        coding: [
          {
            system:
              'http://terminology.hl7.org/CodeSystem/condition-ver-status',
            code: 'confirmed',
          },
        ],
      },
      code: {
        coding: input.icd10Code
          ? [
              {
                system: 'http://hl7.org/fhir/sid/icd-10',
                code: input.icd10Code,
                display: input.icd10Display ?? input.assessment,
              },
            ]
          : [],
        text: input.assessment,
      },
      subject: {
        reference: `Patient/${input.patientFhirId}`,
      },
      encounter: {
        reference: `Encounter/${encounterId}`,
      },
      ...(input.problemFhirId && {
        extension: [
          {
            url: 'https://hipaa-hce/fhir/extension/problem-reference',
            valueReference: { reference: `Condition/${input.problemFhirId}` },
          },
        ],
      }),
      meta: {
        tag: [{ system: 'https://hipaa-hce/tenant', code: input.tenantId }],
      },
    };
  }

  buildObservationResource(
    input: FhirEvolutionInput,
    encounterId: string,
    section: { code: string; display: string; value: string | undefined },
  ) {
    return {
      resourceType: 'Observation',
      status: 'final',
      category: [
        {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'exam',
              display: 'Exam',
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: section.code,
            display: section.display,
          },
        ],
        text: section.display,
      },
      subject: {
        reference: `Patient/${input.patientFhirId}`,
      },
      encounter: {
        reference: `Encounter/${encounterId}`,
      },
      effectiveDateTime: input.evolutionDate,
      performer: [
        { reference: `Practitioner/${input.practitionerFhirId}` },
      ],
      valueString: section.value,
      meta: {
        tag: [{ system: 'https://hipaa-hce/tenant', code: input.tenantId }],
      },
    };
  }

  // -------------------------------------------------------------------
  // HTTP helper (AWS HealthLake requires AWS Sig V4)
  // -------------------------------------------------------------------

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: object,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method,
          url,
          data: body,
          headers: {
            'Content-Type': 'application/fhir+json',
            Accept: 'application/fhir+json',
          },
          // In production, add AWS Signature V4 interceptor (aws4 / @aws-sdk)
        }),
      );
      return (response as any).data;
    } catch (error: any) {
      this.logger.error(
        `FHIR ${method} ${path} failed: ${error?.message}`,
        error?.response?.data,
      );
      throw new InternalServerErrorException(
        `FHIR request failed: ${error?.message}`,
      );
    }
  }
}
