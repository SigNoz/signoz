import {
	calculateStartEndTime,
	convertDataToMetricRangePayload,
} from '../utils';

const makeData = (
	timestamps: number[],
	billingPeriodStart?: number,
	billingPeriodEnd?: number,
) => ({
	billingPeriodStart,
	billingPeriodEnd,
	details: {
		total: 0,
		baseFee: 0,
		billTotal: 0,
		breakdown: [
			{
				type: 'Logs',
				unit: 'GB',
				dayWiseBreakdown: {
					breakdown: timestamps.map((timestamp) => ({
						timestamp,
						total: 0,
						quantity: 0,
						count: 0,
						size: 0,
					})),
				},
			},
		],
	},
});

describe('convertDataToMetricRangePayload', () => {
	it('returns empty result when all dayWiseBreakdown.breakdown are null', () => {
		const data = {
			billingPeriodStart: 1778763678,
			billingPeriodEnd: 1781442078,
			details: {
				total: 0,
				baseFee: 49,
				billTotal: 49,
				breakdown: [
					{
						type: 'Metrics',
						unit: 'Million',
						tiers: [],
						dayWiseBreakdown: { type: '', breakdown: null },
					},
					{
						type: 'Traces',
						unit: 'GB',
						tiers: [],
						dayWiseBreakdown: { type: '', breakdown: null },
					},
					{
						type: 'Logs',
						unit: 'GB',
						tiers: [],
						dayWiseBreakdown: { type: '', breakdown: null },
					},
				],
			},
		};
		const result = convertDataToMetricRangePayload(data);
		expect(result.data.result).toHaveLength(0);
	});

	it('includes only series that have day-wise data', () => {
		const data = {
			details: {
				breakdown: [
					{
						type: 'Metrics',
						unit: 'Million',
						dayWiseBreakdown: { breakdown: null },
					},
					{
						type: 'Logs',
						unit: 'GB',
						dayWiseBreakdown: {
							breakdown: [
								{ timestamp: 1000, total: 5, quantity: 10, count: 0, size: 0 },
							],
						},
					},
				],
			},
		};
		const result = convertDataToMetricRangePayload(data);
		expect(result.data.result).toHaveLength(1);
		expect(result.data.result[0].legend).toBe('Logs');
	});
});

describe('calculateStartEndTime', () => {
	it('returns min/max of all breakdown timestamps', () => {
		const data = makeData([1000, 3000, 2000]);
		expect(calculateStartEndTime(data)).toStrictEqual({
			startTime: 1000,
			endTime: 3000,
		});
	});

	it('includes billingPeriodStart and billingPeriodEnd in the range', () => {
		const data = makeData([2000, 3000], 500, 4000);
		expect(calculateStartEndTime(data)).toStrictEqual({
			startTime: 500,
			endTime: 4000,
		});
	});

	it('returns undefined when there are no timestamps and no billing period', () => {
		expect(calculateStartEndTime({})).toStrictEqual({
			startTime: undefined,
			endTime: undefined,
		});
	});

	it('returns undefined when breakdown is empty', () => {
		const data = makeData([]);
		expect(calculateStartEndTime(data)).toStrictEqual({
			startTime: undefined,
			endTime: undefined,
		});
	});

	it('filters out non-finite billingPeriod values', () => {
		const data = makeData([1000], NaN, Infinity);
		expect(calculateStartEndTime(data)).toStrictEqual({
			startTime: 1000,
			endTime: 1000,
		});
	});

	it('works when details is missing', () => {
		expect(
			calculateStartEndTime({ billingPeriodStart: 100, billingPeriodEnd: 200 }),
		).toStrictEqual({
			startTime: 100,
			endTime: 200,
		});
	});
});
