import { calculateStartEndTime } from '../utils';

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
