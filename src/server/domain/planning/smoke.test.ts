import {describe, expect, it} from 'vitest';
import {apiService} from '@/services/ApiService';

describe('socle de tests', () => {
    it('résout l\'alias @/ vers les sources', () => {
        expect(typeof apiService.get).toBe('function');
    });
});
