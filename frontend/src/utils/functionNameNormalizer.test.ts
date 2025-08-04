import { QueryFunctionsTypes } from 'types/common/queryBuilder';

import { normalizeFunctionName } from './functionNameNormalizer';

describe('functionNameNormalizer', () => {
	describe('normalizeFunctionName', () => {
		it('should normalize timeshift to timeShift', () => {
			expect(normalizeFunctionName('timeshift')).toBe(
				QueryFunctionsTypes.TIME_SHIFT,
			);
		});

		it('should normalize TIMESHIFT to timeShift', () => {
			expect(normalizeFunctionName('TIMESHIFT')).toBe(
				QueryFunctionsTypes.TIME_SHIFT,
			);
		});

		it('should normalize TimeShift to timeShift', () => {
			expect(normalizeFunctionName('TimeShift')).toBe(
				QueryFunctionsTypes.TIME_SHIFT,
			);
		});

		it('should return original value if no normalization needed', () => {
			expect(normalizeFunctionName('timeShift')).toBe('timeShift');
		});

		it('should handle unknown function names', () => {
			expect(normalizeFunctionName('unknownFunction')).toBe('unknownFunction');
		});

		it('should normalize other function names', () => {
			expect(normalizeFunctionName('cutoffmin')).toBe(
				QueryFunctionsTypes.CUTOFF_MIN,
			);
			expect(normalizeFunctionName('cutoffmax')).toBe(
				QueryFunctionsTypes.CUTOFF_MAX,
			);
			expect(normalizeFunctionName('clampmin')).toBe(
				QueryFunctionsTypes.CLAMP_MIN,
			);
			expect(normalizeFunctionName('clampmax')).toBe(
				QueryFunctionsTypes.CLAMP_MAX,
			);
			expect(normalizeFunctionName('absolut')).toBe(QueryFunctionsTypes.ABSOLUTE);
			expect(normalizeFunctionName('runningdiff')).toBe(
				QueryFunctionsTypes.RUNNING_DIFF,
			);
			expect(normalizeFunctionName('log2')).toBe(QueryFunctionsTypes.LOG_2);
			expect(normalizeFunctionName('log10')).toBe(QueryFunctionsTypes.LOG_10);
			expect(normalizeFunctionName('cumulativesum')).toBe(
				QueryFunctionsTypes.CUMULATIVE_SUM,
			);
			expect(normalizeFunctionName('ewma3')).toBe(QueryFunctionsTypes.EWMA_3);
			expect(normalizeFunctionName('ewma5')).toBe(QueryFunctionsTypes.EWMA_5);
			expect(normalizeFunctionName('ewma7')).toBe(QueryFunctionsTypes.EWMA_7);
			expect(normalizeFunctionName('median3')).toBe(QueryFunctionsTypes.MEDIAN_3);
			expect(normalizeFunctionName('median5')).toBe(QueryFunctionsTypes.MEDIAN_5);
			expect(normalizeFunctionName('median7')).toBe(QueryFunctionsTypes.MEDIAN_7);
			expect(normalizeFunctionName('anomaly')).toBe(QueryFunctionsTypes.ANOMALY);
		});
	});

	describe('function argument handling', () => {
		it('should handle string arguments correctly', () => {
			const func = {
				name: 'timeshift',
				args: ['5m'],
			};
			const normalizedName = normalizeFunctionName(func.name);
			expect(normalizedName).toBe(QueryFunctionsTypes.TIME_SHIFT);
			expect(func.args[0]).toBe('5m');
		});

		it('should handle numeric arguments correctly', () => {
			const func = {
				name: 'cutoffmin',
				args: [100],
			};
			const normalizedName = normalizeFunctionName(func.name);
			expect(normalizedName).toBe(QueryFunctionsTypes.CUTOFF_MIN);
			expect(func.args[0]).toBe(100);
		});
	});
});
