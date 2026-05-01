import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export type FhirProblemClinicalStatus =
  | 'active'
  | 'resolved'
  | 'inactive'
  | 'recurrence'
  | 'remission';

/**
 * Valores alineados con http://terminology.hl7.org/CodeSystem/condition-category
 */
export type FhirProblemCategory =
  | 'encounter-diagnosis'
  | 'problem-list-item'
  | 'health-concern';

export type FhirEvolutionTrend =
  | 'improving'
  | 'stable'
  | 'worsening'
  | 'resolution';

export type FhirOrderType = 'medication' | 'laboratory' | 'imaging';

export type FhirOrderStatus =
  | 'draft'
  | 'active'
  | 'completed'
  | 'cancelled';

export interface FhirPatientInput {
  /** Local DB UUID — used as a secondary identifier in the FHIR resource. */
  patientId: string;
  /**
   * Canonical Medplum Patient.id from a previous sync.
   * When present, the update targets `/Patient/{fhirId}` directly.
   * When absent, a conditional update by DNI is used so Medplum assigns the ID.
   */
  fhirId?: string;
  dni: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  sex: 'male' | 'female' | 'other' | 'unknown';
  email?: string;
  phone?: string;
}

export interface FhirProblemInput {
  patientFhirId: string;
  practitionerFhirId?: string;
  encounterId?: string;
  tenantId: string;
  title: string;
  clinicalStatus: FhirProblemClinicalStatus;
  category?: FhirProblemCategory;
  onsetDate?: string;
  abatementDate?: string;
  closureSummary?: string;
  verificationStatus?: 'provisional' | 'differential' | 'confirmed' | 'refuted';
  snomedCode?: string;
  snomedDisplay?: string;
  icd10Code?: string;
  icd10Display?: string;
  icd11Code?: string;
  icd11Display?: string;
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
  trend?: FhirEvolutionTrend;
  problemTitle?: string;
  problemFhirId?: string;
  snomedCode?: string;
  snomedDisplay?: string;
  icd10Code?: string;
  icd10Display?: string;
  icd11Code?: string;
  icd11Display?: string;
  problemClinicalStatus?: FhirProblemClinicalStatus;
}

export interface FhirOrderInput {
  orderId: string;
  patientFhirId: string;
  practitionerFhirId: string;
  encounterId?: string;
  problemFhirId?: string;
  tenantId: string;
  authoredOn: string;
  type: FhirOrderType;
  status?: FhirOrderStatus;
  detail: string;
  medicationCode?: string;
  medicationDisplay?: string;
  serviceCode?: string;
  serviceDisplay?: string;
  note?: string;
}

/**
 * FhirService
 *
 * Facade that communicates with AWS HealthLake (FHIR R4 compliant).
 * Requests are signed with AWS Signature V4 via the configured IAM role.
 *
 * Key resources managed:
 *  - Patient
 *  - Condition (problem thread)
 *  - Encounter (consultation context)
 *  - ClinicalImpression (clinical synthesis per evolution)
 *  - Observation (targeted findings + trend)
 *  - MedicationRequest / ServiceRequest (orders)
 */
@Injectable()
export class FhirService {
  private readonly logger = new Logger(FhirService.name);
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  /** Token Medplum en cache para evitar solicitar uno nuevo en cada request */
  private medplumAccessToken: string | null = null;
  private medplumTokenExpiresAt = 0;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('medplum.baseUrl') ??
      this.configService.get<string>('MEDPLUM_BASE_URL') ??
      'https://api.medplum.com';

    this.clientId =
      this.configService.get<string>('medplum.clientId') ??
      this.configService.get<string>('MEDPLUM_CLIENT_ID') ??
      '';

    this.clientSecret =
      this.configService.get<string>('medplum.clientSecret') ??
      this.configService.get<string>('MEDPLUM_CLIENT_SECRET') ??
      '';
  }

  isConfigured(): boolean {
    return this.clientId.trim().length > 0 && this.clientSecret.trim().length > 0;
  }

  async upsertPatient(input: FhirPatientInput): Promise<string> {
    if (input.fhirId) {
      // Patient already synced: update the known Medplum resource by its canonical ID.
      const resource = this.buildPatientResource(input, input.fhirId);
      const response = await this.request<{ id: string }>(
        'PUT',
        `/Patient/${input.fhirId}`,
        resource,
      );
      return response.id;
    }

    // First sync: FHIR conditional update by DNI identifier.
    // Medplum searches for an existing Patient with this identifier;
    // creates one if none found, updates the match if exactly one found.
    // The server assigns and returns the canonical FHIR Patient.id.
    const resource = this.buildPatientResource(input);
    const response = await this.request<{ id: string }>(
      'PUT',
      `/Patient?identifier=urn:oid:2.16.840.1.113883.4.330.32|${encodeURIComponent(input.dni)}`,
      resource,
    );
    return response.id;
  }

  async upsertProblem(input: FhirProblemInput, resourceId?: string): Promise<string> {
    const path = resourceId ? `/Condition/${resourceId}` : '/Condition';
    const method = resourceId ? 'PUT' : 'POST';
    const response = await this.request<{ id: string }>(
      method,
      path,
      this.buildProblemConditionResource(input, resourceId),
    );
    return response.id;
  }

  async createEvolution(input: FhirEvolutionInput): Promise<{
    encounterId: string;
    conditionId?: string;
    clinicalImpressionId?: string;
    observationIds: string[];
  }> {
    const encounter = await this.request<{ id: string }>(
      'POST',
      '/Encounter',
      this.buildEncounterResource(input),
    );

    let conditionId = input.problemFhirId;
    if (!conditionId && (input.problemTitle || input.icd10Code || input.snomedCode || input.icd11Code)) {
      conditionId = (
        await this.request<{ id: string }>(
          'POST',
          '/Condition',
          this.buildProblemConditionResource({
            patientFhirId: input.patientFhirId,
            practitionerFhirId: input.practitionerFhirId,
            encounterId: encounter.id,
            tenantId: input.tenantId,
            title: input.problemTitle ?? input.assessment ?? 'Problema en evaluación',
            clinicalStatus: input.problemClinicalStatus ?? 'active',
            snomedCode: input.snomedCode,
            snomedDisplay: input.snomedDisplay,
            icd10Code: input.icd10Code,
            icd10Display: input.icd10Display,
            icd11Code: input.icd11Code,
            icd11Display: input.icd11Display,
          }),
        )
      ).id;
    }

    let clinicalImpressionId: string | undefined;
    if (input.subjective || input.objective || input.assessment || input.plan || input.trend) {
      clinicalImpressionId = (
        await this.request<{ id: string }>(
          'POST',
          '/ClinicalImpression',
          this.buildClinicalImpressionResource(
            { ...input, problemFhirId: conditionId ?? input.problemFhirId },
            encounter.id,
          ),
        )
      ).id;
    }

    const observationIds: string[] = [];
    const soapSections: Array<{ code: string; display: string; value: string | undefined }> = [
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
      const observation = await this.request<{ id: string }>(
        'POST',
        '/Observation',
        this.buildObservationResource(
          { ...input, problemFhirId: conditionId ?? input.problemFhirId },
          encounter.id,
          section,
        ),
      );
      observationIds.push(observation.id);
    }

    if (input.trend) {
      const trendObservation = await this.request<{ id: string }>(
        'POST',
        '/Observation',
        this.buildTrendObservationResource(
          { ...input, problemFhirId: conditionId ?? input.problemFhirId },
          encounter.id,
        ),
      );
      observationIds.push(trendObservation.id);
    }

    return {
      encounterId: encounter.id,
      conditionId,
      clinicalImpressionId,
      observationIds,
    };
  }

  async createOrder(input: FhirOrderInput): Promise<{ id: string; resourceType: string }> {
    const resource = this.buildOrderResource(input);
    const endpoint = resource.resourceType === 'MedicationRequest'
      ? '/MedicationRequest'
      : '/ServiceRequest';
    const response = await this.request<{ id: string }>('POST', endpoint, resource);
    return { id: response.id, resourceType: resource.resourceType };
  }

  async getResource(resourceType: string, resourceId: string) {
    return this.request<any>('GET', `/${resourceType}/${resourceId}`);
  }

  mapProblemStatusToConditionClinicalStatus(status: FhirProblemClinicalStatus) {
    return {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: status,
        },
      ],
    };
  }

  private categoryToSpanish(category?: FhirProblemCategory): string {
    if (category === 'problem-list-item') return 'Problema longitudinal';
    if (category === 'health-concern') return 'Preocupación de salud';
    return 'Diagnóstico del encuentro';
  }

  mapTrendToScore(trend?: FhirEvolutionTrend): number | undefined {
    switch (trend) {
      case 'worsening':
        return -1;
      case 'stable':
        return 0;
      case 'improving':
        return 1;
      case 'resolution':
        return 2;
      default:
        return undefined;
    }
  }

  buildPatientResource(input: FhirPatientInput, fhirId?: string) {
    return {
      resourceType: 'Patient',
      // Include the canonical FHIR id only when already known (PUT update).
      // Omit it for conditional create so Medplum assigns its own ID.
      ...(fhirId ? { id: fhirId } : {}),
      meta: {
        profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'],
      },
      identifier: [
        {
          use: 'official',
          system: 'urn:oid:2.16.840.1.113883.4.330.32',
          value: input.dni,
        },
        {
          use: 'secondary',
          system: 'https://hipaa-hce/fhir/patient-id',
          value: input.patientId,
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
        ...(input.email ? [{ system: 'email', value: input.email, use: 'home' }] : []),
        ...(input.phone ? [{ system: 'phone', value: input.phone, use: 'mobile' }] : []),
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
      diagnosis: input.problemFhirId
        ? [
          {
            condition: {
              reference: `Condition/${input.problemFhirId}`,
            },
          },
        ]
        : undefined,
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

  buildProblemConditionResource(input: FhirProblemInput, resourceId?: string) {
    const codings = this.buildProblemCodings(input);

    return {
      resourceType: 'Condition',
      ...(resourceId ? { id: resourceId } : {}),
      clinicalStatus: this.mapProblemStatusToConditionClinicalStatus(input.clinicalStatus),
      verificationStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
            code: input.verificationStatus ?? 'confirmed',
          },
        ],
      },
      category: [
        {
          coding: [
            {
              // Sistema canónico FHIR R4 para Condition.category
              system: 'http://terminology.hl7.org/CodeSystem/condition-category',
              code: input.category ?? 'encounter-diagnosis',
            },
          ],
          text: this.categoryToSpanish(input.category),
        },
      ],
      code: {
        coding: codings,
        text: input.title,
      },
      subject: {
        reference: `Patient/${input.patientFhirId}`,
      },
      encounter: input.encounterId
        ? {
          reference: `Encounter/${input.encounterId}`,
        }
        : undefined,
      recorder: input.practitionerFhirId
        ? {
          reference: `Practitioner/${input.practitionerFhirId}`,
        }
        : undefined,
      onsetDateTime: input.onsetDate,
      abatementDateTime: input.abatementDate,
      note: input.closureSummary
        ? [{ text: input.closureSummary }]
        : undefined,
      meta: {
        tag: [{ system: 'https://hipaa-hce/tenant', code: input.tenantId }],
      },
    };
  }

  buildConditionResource(input: FhirEvolutionInput, encounterId: string) {
    return this.buildProblemConditionResource({
      patientFhirId: input.patientFhirId,
      practitionerFhirId: input.practitionerFhirId,
      encounterId,
      tenantId: input.tenantId,
      title: input.problemTitle ?? input.assessment ?? 'Problema en evaluación',
      clinicalStatus: input.problemClinicalStatus ?? 'active',
      snomedCode: input.snomedCode,
      snomedDisplay: input.snomedDisplay,
      icd10Code: input.icd10Code,
      icd10Display: input.icd10Display,
      icd11Code: input.icd11Code,
      icd11Display: input.icd11Display,
    });
  }

  buildClinicalImpressionResource(input: FhirEvolutionInput, encounterId: string) {
    return {
      resourceType: 'ClinicalImpression',
      status: 'completed',
      description: input.subjective,
      summary: input.assessment ?? input.problemTitle,
      subject: {
        reference: `Patient/${input.patientFhirId}`,
      },
      encounter: {
        reference: `Encounter/${encounterId}`,
      },
      effectiveDateTime: input.evolutionDate,
      assessor: {
        reference: `Practitioner/${input.practitionerFhirId}`,
      },
      problem: input.problemFhirId
        ? [{ reference: `Condition/${input.problemFhirId}` }]
        : undefined,
      finding: [
        ...(input.objective
          ? [
            {
              itemCodeableConcept: { text: 'Hallazgos objetivos' },
              basis: input.objective,
            },
          ]
          : []),
        ...(input.plan
          ? [
            {
              itemCodeableConcept: { text: 'Plan de acción' },
              basis: input.plan,
            },
          ]
          : []),
      ],
      note: input.trend ? [{ text: `Trend: ${input.trend}` }] : undefined,
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
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
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
      focus: input.problemFhirId
        ? [{ reference: `Condition/${input.problemFhirId}` }]
        : undefined,
      effectiveDateTime: input.evolutionDate,
      performer: [{ reference: `Practitioner/${input.practitionerFhirId}` }],
      valueString: section.value,
      meta: {
        tag: [{ system: 'https://hipaa-hce/tenant', code: input.tenantId }],
      },
    };
  }

  buildTrendObservationResource(input: FhirEvolutionInput, encounterId: string) {
    const score = this.mapTrendToScore(input.trend);

    return {
      resourceType: 'Observation',
      status: 'final',
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'survey',
              display: 'Survey',
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: 'https://hipaa-hce/fhir/CodeSystem/evolution-trend',
            code: 'problem-trend',
            display: 'Problem evolution trend',
          },
        ],
        text: 'Problem evolution trend',
      },
      subject: {
        reference: `Patient/${input.patientFhirId}`,
      },
      encounter: {
        reference: `Encounter/${encounterId}`,
      },
      focus: input.problemFhirId
        ? [{ reference: `Condition/${input.problemFhirId}` }]
        : undefined,
      effectiveDateTime: input.evolutionDate,
      valueCodeableConcept: input.trend
        ? {
          coding: [
            {
              system: 'https://hipaa-hce/fhir/CodeSystem/evolution-trend',
              code: input.trend,
              display: input.trend,
            },
          ],
          text: input.trend,
        }
        : undefined,
      component: score === undefined
        ? undefined
        : [
          {
            code: {
              coding: [
                {
                  system: 'https://hipaa-hce/fhir/CodeSystem/evolution-trend',
                  code: 'trend-score',
                  display: 'Trend score',
                },
              ],
              text: 'Trend score',
            },
            valueInteger: score,
          },
        ],
      performer: [{ reference: `Practitioner/${input.practitionerFhirId}` }],
      meta: {
        tag: [{ system: 'https://hipaa-hce/tenant', code: input.tenantId }],
      },
    };
  }

  buildOrderResource(input: FhirOrderInput) {
    return input.type === 'medication'
      ? this.buildMedicationRequestResource(input)
      : this.buildServiceRequestResource(input);
  }

  buildMedicationRequestResource(input: FhirOrderInput) {
    return {
      resourceType: 'MedicationRequest',
      identifier: [
        {
          system: 'https://hipaa-hce/orders',
          value: input.orderId,
        },
      ],
      status: input.status ?? 'active',
      intent: 'order',
      subject: {
        reference: `Patient/${input.patientFhirId}`,
      },
      encounter: input.encounterId
        ? {
          reference: `Encounter/${input.encounterId}`,
        }
        : undefined,
      medicationCodeableConcept: {
        coding: input.medicationCode
          ? [
            {
              system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
              code: input.medicationCode,
              display: input.medicationDisplay ?? input.detail,
            },
          ]
          : [],
        text: input.medicationDisplay ?? input.detail,
      },
      authoredOn: input.authoredOn,
      requester: {
        reference: `Practitioner/${input.practitionerFhirId}`,
      },
      reasonReference: input.problemFhirId
        ? [{ reference: `Condition/${input.problemFhirId}` }]
        : undefined,
      note: input.note ? [{ text: input.note }] : undefined,
      meta: {
        tag: [{ system: 'https://hipaa-hce/tenant', code: input.tenantId }],
      },
    };
  }

  buildServiceRequestResource(input: FhirOrderInput) {
    return {
      resourceType: 'ServiceRequest',
      identifier: [
        {
          system: 'https://hipaa-hce/orders',
          value: input.orderId,
        },
      ],
      status: input.status ?? 'active',
      intent: 'order',
      category: [
        {
          coding: [
            {
              system: 'https://hipaa-hce/fhir/CodeSystem/order-type',
              code: input.type,
              display: input.type,
            },
          ],
          text: input.type,
        },
      ],
      code: {
        coding: input.serviceCode
          ? [
            {
              system: 'http://loinc.org',
              code: input.serviceCode,
              display: input.serviceDisplay ?? input.detail,
            },
          ]
          : [],
        text: input.serviceDisplay ?? input.detail,
      },
      subject: {
        reference: `Patient/${input.patientFhirId}`,
      },
      encounter: input.encounterId
        ? {
          reference: `Encounter/${input.encounterId}`,
        }
        : undefined,
      authoredOn: input.authoredOn,
      requester: {
        reference: `Practitioner/${input.practitionerFhirId}`,
      },
      reasonReference: input.problemFhirId
        ? [{ reference: `Condition/${input.problemFhirId}` }]
        : undefined,
      note: input.note ? [{ text: input.note }] : undefined,
      meta: {
        tag: [{ system: 'https://hipaa-hce/tenant', code: input.tenantId }],
      },
    };
  }

  private buildProblemCodings(
    input: Pick<
      FhirProblemInput,
      | 'snomedCode'
      | 'snomedDisplay'
      | 'icd10Code'
      | 'icd10Display'
      | 'icd11Code'
      | 'icd11Display'
    >,
  ) {
    return [
      ...(input.snomedCode
        ? [
          {
            system: 'http://snomed.info/sct',
            code: input.snomedCode,
            display: input.snomedDisplay,
          },
        ]
        : []),
      ...(input.icd10Code
        ? [
          {
            system: 'http://hl7.org/fhir/sid/icd-10',
            code: input.icd10Code,
            display: input.icd10Display,
          },
        ]
        : []),
      ...(input.icd11Code
        ? [
          {
            system: 'http://id.who.int/icd/release/11/mms',
            code: input.icd11Code,
            display: input.icd11Display,
          },
        ]
        : []),
    ];
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: object,
  ): Promise<T> {
    const url = `${this.baseUrl}/fhir/R4${path}`;
    const token = await this.getMedplumToken();

    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method,
          url,
          data: body,
          headers: {
            'Content-Type': 'application/fhir+json',
            Accept: 'application/fhir+json',
            Authorization: `Bearer ${token}`,
          },
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

  /**
   * Obtiene un Bearer token de Medplum usando client credentials OAuth2.
   * El token se cachea en memoria durante su tiempo de vida (~1h).
   */
  private async getMedplumToken(): Promise<string> {
    if (this.medplumAccessToken && Date.now() < this.medplumTokenExpiresAt) {
      return this.medplumAccessToken;
    }

    if (!this.isConfigured()) {
      throw new InternalServerErrorException('FHIR auth skipped: Medplum credentials missing');
    }

    const tokenUrl = `${this.baseUrl}/oauth2/token`;
    const params = new URLSearchParams();
    params.set('grant_type', 'client_credentials');
    params.set('client_id', this.clientId);
    params.set('client_secret', this.clientSecret);

    try {
      const response = await firstValueFrom(
        this.httpService.post<{ access_token: string; expires_in: number }>(
          tokenUrl,
          params.toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        ),
      );
      const { access_token, expires_in } = response.data;
      this.medplumAccessToken = access_token;
      // Renovar 60 s antes del vencimiento
      this.medplumTokenExpiresAt = Date.now() + (expires_in - 60) * 1000;
      return access_token;
    } catch (error: any) {
      this.logger.error('No se pudo obtener token Medplum', error?.message);
      throw new InternalServerErrorException('FHIR auth failed: no Medplum token');
    }
  }
}
