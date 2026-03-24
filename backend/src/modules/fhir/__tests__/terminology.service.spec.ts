import { TerminologyService } from '../terminology.service';

describe('TerminologyService', () => {
    it('returns local fallback when terminology server is not configured', async () => {
        const service = new TerminologyService(
            { get: jest.fn() } as any,
            { get: jest.fn().mockReturnValue(undefined) } as any,
        );

        const result = await service.normalizeProblemCoding({
            text: 'Diabetes mellitus tipo 2',
            snomedCode: '44054006',
            preferredSystem: 'snomed',
        });

        expect(result.validated).toBe(true);
        expect(result.preferred?.system).toBe('snomed');
        expect(result.preferred?.code).toBe('44054006');
    });

    it('returns unvalidated payload when no code and no terminology server are available', async () => {
        const service = new TerminologyService(
            { get: jest.fn() } as any,
            { get: jest.fn().mockReturnValue(undefined) } as any,
        );

        const result = await service.normalizeProblemCoding({
            text: 'Dolor abdominal en estudio',
        });

        expect(result.validated).toBe(false);
        expect(result.preferred).toBeUndefined();
        expect(result.alternatives).toHaveLength(0);
    });
});
