import GetMinMax from './getMinMax';

const DAY_NS = 24 * 60 * 60 * 1000 * 1e6;

function rangeInDays(interval: string): number {
	const { minTime, maxTime } = GetMinMax(interval);
	return Math.round((maxTime - minTime) / DAY_NS);
}

describe('GetMinMax', () => {
	it.each([
		['1month', 30],
		['2months', 60],
		['3months', 90],
		['6month', 180],
		['10d', 10],
		['3w', 21],
	])('resolves %p to %p days', (interval, days) => {
		expect(rangeInDays(interval)).toBe(days);
	});

	it('throws on an unknown interval', () => {
		expect(() => GetMinMax('1y')).toThrow('invalid time type');
	});
});
