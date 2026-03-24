import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export type TerminologySystemName = 'snomed' | 'icd10' | 'icd11';

export interface TerminologyMatch {
    system: TerminologySystemName;
    systemUrl: string;
    valueSetUrl?: string;
    code: string;
    display: string;
    version?: string;
}

export interface NormalizedProblemCoding {
    text: string;
    preferred?: TerminologyMatch;
    alternatives: TerminologyMatch[];
    validated: boolean;
}

@Injectable()
export class TerminologyService {
    private readonly logger = new Logger(TerminologyService.name);
    private readonly baseUrl: string | undefined;

    private readonly systems: Record<
        TerminologySystemName,
        { systemUrl: string; valueSetUrl?: string }
    > = {
            snomed: {
                systemUrl: 'http://snomed.info/sct',
                valueSetUrl: 'http://snomed.info/sct?fhir_vs',
            },
            icd10: {
                systemUrl: 'http://hl7.org/fhir/sid/icd-10',
            },
            icd11: {
                systemUrl: 'http://id.who.int/icd/release/11/mms',
            },
        };

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.baseUrl = this.configService.get<string>('TERMINOLOGY_SERVER_URL');
    }

    async normalizeProblemCoding(input: {
        text: string;
        snomedCode?: string;
        icd10Code?: string;
        icd11Code?: string;
        preferredSystem?: TerminologySystemName;
    }): Promise<NormalizedProblemCoding> {
        const matches = (
            await Promise.all([
                input.snomedCode ? this.lookupCode('snomed', input.snomedCode) : undefined,
                input.icd10Code ? this.lookupCode('icd10', input.icd10Code) : undefined,
                input.icd11Code ? this.lookupCode('icd11', input.icd11Code) : undefined,
            ])
        ).filter(Boolean) as TerminologyMatch[];

        if (matches.length > 0) {
            const preferred = this.selectPreferredMatch(matches, input.preferredSystem);
            return {
                text: input.text,
                preferred,
                alternatives: matches.filter((match) => match.code !== preferred?.code || match.system !== preferred.system),
                validated: true,
            };
        }

        if (!this.baseUrl) {
            return {
                text: input.text,
                alternatives: [],
                validated: false,
            };
        }

        const searchedMatches = await this.searchByDisplay(input.text, input.preferredSystem);
        const preferred = this.selectPreferredMatch(searchedMatches, input.preferredSystem);

        return {
            text: input.text,
            preferred,
            alternatives: searchedMatches.filter((match) => match.code !== preferred?.code || match.system !== preferred.system),
            validated: Boolean(preferred),
        };
    }

    async lookupCode(system: TerminologySystemName, code: string): Promise<TerminologyMatch | undefined> {
        if (!this.baseUrl) {
            const local = this.systems[system];
            return {
                system,
                systemUrl: local.systemUrl,
                valueSetUrl: local.valueSetUrl,
                code,
                display: code,
            };
        }

        const definition = this.systems[system];
        const query = new URLSearchParams({
            system: definition.systemUrl,
            code,
        });

        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.baseUrl}/CodeSystem/$lookup?${query.toString()}`, {
                    headers: { Accept: 'application/fhir+json' },
                }),
            );

            const parameters = (response as any).data?.parameter ?? [];
            const display = parameters.find((parameter: any) => parameter.name === 'display')?.valueString ?? code;
            const version = parameters.find((parameter: any) => parameter.name === 'version')?.valueString;

            return {
                system,
                systemUrl: definition.systemUrl,
                valueSetUrl: definition.valueSetUrl,
                code,
                display,
                version,
            };
        } catch (error: any) {
            this.logger.warn(`Terminology lookup failed for ${system}:${code} - ${error?.message}`);
            return undefined;
        }
    }

    private async searchByDisplay(
        text: string,
        preferredSystem?: TerminologySystemName,
    ): Promise<TerminologyMatch[]> {
        const searchOrder: TerminologySystemName[] = preferredSystem
            ? [preferredSystem, ...Object.keys(this.systems).filter((system) => system !== preferredSystem) as TerminologySystemName[]]
            : ['snomed', 'icd10', 'icd11'];

        const results: TerminologyMatch[] = [];
        for (const system of searchOrder) {
            const definition = this.systems[system];
            if (!definition.valueSetUrl || !this.baseUrl) {
                continue;
            }

            const query = new URLSearchParams({
                url: definition.valueSetUrl,
                filter: text,
                count: '10',
            });

            try {
                const response = await firstValueFrom(
                    this.httpService.get(`${this.baseUrl}/ValueSet/$expand?${query.toString()}`, {
                        headers: { Accept: 'application/fhir+json' },
                    }),
                );

                const contains = (response as any).data?.expansion?.contains ?? [];
                for (const concept of contains) {
                    results.push({
                        system,
                        systemUrl: definition.systemUrl,
                        valueSetUrl: definition.valueSetUrl,
                        code: concept.code,
                        display: concept.display,
                        version: concept.version,
                    });
                }

                if (results.length > 0) {
                    break;
                }
            } catch (error: any) {
                this.logger.warn(`Terminology search failed for ${system}:${text} - ${error?.message}`);
            }
        }

        return results;
    }

    private selectPreferredMatch(
        matches: TerminologyMatch[],
        preferredSystem?: TerminologySystemName,
    ) {
        if (!preferredSystem) {
            return matches[0];
        }

        return matches.find((match) => match.system === preferredSystem) ?? matches[0];
    }
}
