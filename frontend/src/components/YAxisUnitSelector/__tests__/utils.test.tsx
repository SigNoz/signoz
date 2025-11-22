import { UniversalYAxisUnit } from '../types';
import {
	getUniversalNameFromMetricUnit,
	mapMetricUnitToUniversalUnit,
	mergeCategories,
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

	describe('mergeCategories', () => {
		it('merges categories correctly', () => {
			const categories1 = [
				{
					name: 'Data',
					units: [
						{ name: 'bytes', id: UniversalYAxisUnit.BYTES },
						{ name: 'kilobytes', id: UniversalYAxisUnit.KILOBYTES },
					],
				},
			];
			const categories2 = [
				{
					name: 'Data',
					units: [{ name: 'bits', id: UniversalYAxisUnit.BITS }],
				},
				{
					name: 'Time',
					units: [{ name: 'seconds', id: UniversalYAxisUnit.SECONDS }],
				},
			];
			const mergedCategories = mergeCategories(categories1, categories2);
			expect(mergedCategories).toEqual([
				{
					name: 'Data',
					units: [
						{ name: 'bytes', id: UniversalYAxisUnit.BYTES },
						{ name: 'kilobytes', id: UniversalYAxisUnit.KILOBYTES },
						{ name: 'bits', id: UniversalYAxisUnit.BITS },
					],
				},
				{
					name: 'Time',
					units: [{ name: 'seconds', id: UniversalYAxisUnit.SECONDS }],
				},
			]);
		});
	});
});
