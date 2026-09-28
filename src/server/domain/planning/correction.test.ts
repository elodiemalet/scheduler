import {describe, expect, it} from 'vitest';
import {buildCorrectionRequest, isBetterCorrection} from '@/server/domain/planning/correction';

describe('buildCorrectionRequest', () => {
    it('liste chaque violation sur sa propre ligne', () => {
        const request = buildCorrectionRequest(['Sport : lundi hors des jours permis', 'Lecture : chevauchement']);
        expect(request).toContain('- Sport : lundi hors des jours permis\n- Lecture : chevauchement');
    });

    it('demande le JSON complet, pas un correctif partiel', () => {
        expect(buildCorrectionRequest(['x'])).toMatch(/json complet/i);
    });
});

describe('isBetterCorrection', () => {
    it('garde la correction qui réduit le nombre de violations', () => {
        expect(isBetterCorrection(['a', 'b'], ['a'])).toBe(true);
        expect(isBetterCorrection(['a'], [])).toBe(true);
    });

    it('écarte une correction qui n’améliore rien', () => {
        expect(isBetterCorrection(['a'], ['b'])).toBe(false);
        expect(isBetterCorrection(['a'], ['a', 'b'])).toBe(false);
    });
});
