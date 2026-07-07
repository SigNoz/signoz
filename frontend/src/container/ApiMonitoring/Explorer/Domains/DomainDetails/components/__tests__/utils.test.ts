import {
	getMinStepIntervalFromApiResponse,
	getStepIntervalForQuery,
	getTracesTimeRangeFromStepInterval,
} from '../utils';

describe('StatusCodeBarCharts utils', () => {
	describe('getTracesTimeRangeFromStepInterval', () => {
		const xValue = 1609459200; // seconds

		it('keeps start at click time with a minimum 5 minute end range', () => {
			const { start, end } = getTracesTimeRangeFromStepInterval(xValue, 60);

			expect(start).toBe(xValue * 1000);
			expect(end - start).toBe(5 * 60 * 1000);
			expect(end).toBe(xValue * 1000 + 5 * 60 * 1000);
		});

		it('extends end when step interval is larger than 5 minutes', () => {
			const stepInterval = 600; // 10 minutes
			const { start, end } = getTracesTimeRangeFromStepInterval(
				xValue,
				stepInterval,
			);

			expect(start).toBe(xValue * 1000);
			expect(end - start).toBe(10 * 60 * 1000);
			expect(end).toBe(xValue * 1000 + 10 * 60 * 1000);
		});
	});

	describe('getMinStepIntervalFromApiResponse', () => {
		it('returns 60 when step intervals are missing', () => {
			expect(getMinStepIntervalFromApiResponse({} as any)).toBe(60);
		});

		it('returns the minimum step interval from the response', () => {
			const apiResponse = {
				data: {
					newResult: {
						meta: {
							stepIntervals: { A: 120, B: 60 },
						},
					},
				},
			};

			expect(getMinStepIntervalFromApiResponse(apiResponse as any)).toBe(60);
		});
	});

	describe('getStepIntervalForQuery', () => {
		it('returns query-specific step interval when available', () => {
			const apiResponse = {
				data: {
					newResult: {
						meta: {
							stepIntervals: { A: 120, B: 60 },
						},
					},
				},
			};

			expect(getStepIntervalForQuery(apiResponse as any, 'A')).toBe(120);
			expect(getStepIntervalForQuery(apiResponse as any, 'B')).toBe(60);
		});
	});
});
