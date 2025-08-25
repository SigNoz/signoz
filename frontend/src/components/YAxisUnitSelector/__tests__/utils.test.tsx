import {
	getUniversalNameFromMetricUnit,
	mapMetricUnitToUniversalUnit,
} from '../utils';

describe('YAxisUnitSelector utils', () => {
	describe('mapMetricUnitToUniversalUnit', () => {
		it('maps known units correctly', () => {
			expect(mapMetricUnitToUniversalUnit('bytes')).toBe('By');
			expect(mapMetricUnitToUniversalUnit('seconds')).toBe('s');
			expect(mapMetricUnitToUniversalUnit('bytes_per_second')).toBe('By/s');
		});

		it('returns null or self for unknown units', () => {
			expect(mapMetricUnitToUniversalUnit('unknown_unit')).toBe('unknown_unit');
			expect(mapMetricUnitToUniversalUnit('')).toBe(null);
			expect(mapMetricUnitToUniversalUnit(undefined)).toBe(null);
		});
	});

	describe('getUniversalNameFromMetricUnit', () => {
		it('returns human readable names for known units', () => {
			expect(getUniversalNameFromMetricUnit('bytes')).toBe('Bytes (B)');
			expect(getUniversalNameFromMetricUnit('seconds')).toBe('Seconds (s)');
			expect(getUniversalNameFromMetricUnit('bytes_per_second')).toBe('Bytes/sec');
		});

		it('returns original unit for unknown units', () => {
			expect(getUniversalNameFromMetricUnit('unknown_unit')).toBe('unknown_unit');
			expect(getUniversalNameFromMetricUnit('')).toBe('-');
			expect(getUniversalNameFromMetricUnit(undefined)).toBe('-');
		});

		it('handles case variations', () => {
			expect(getUniversalNameFromMetricUnit('bytes')).toBe('Bytes (B)');
			expect(getUniversalNameFromMetricUnit('s')).toBe('Seconds (s)');
		});
	});
});
