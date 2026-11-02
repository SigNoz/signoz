import { getTimeRangeFromActionQuery } from '../getTimeRangeFromActionQuery';

const START_MS = Date.UTC(2026, 6, 26, 10, 34);
const END_MS = Date.UTC(2026, 6, 26, 10, 49);

describe('getTimeRangeFromActionQuery', () => {
	it('returns the absolute range from the query envelope', () => {
		expect(
			getTimeRangeFromActionQuery({ start: START_MS, end: END_MS }),
		).toStrictEqual({ start: START_MS, end: END_MS });
	});

	it('normalizes nanosecond timestamps to milliseconds', () => {
		expect(
			getTimeRangeFromActionQuery({
				start: START_MS * 1_000_000,
				end: END_MS * 1_000_000,
			}),
		).toStrictEqual({ start: START_MS, end: END_MS });
	});

	it.each([
		['a missing query', undefined],
		['a null query', null],
		['missing timestamps', {}],
		['a missing end', { start: START_MS }],
		['string timestamps', { start: String(START_MS), end: String(END_MS) }],
		[
			'non-finite timestamps',
			{ start: Number.NaN, end: Number.POSITIVE_INFINITY },
		],
		['non-positive timestamps', { start: 0, end: -1 }],
		['an empty range', { start: START_MS, end: START_MS }],
		['an inverted range', { start: END_MS, end: START_MS }],
	])('returns null for %s', (_, query) => {
		expect(getTimeRangeFromActionQuery(query)).toBeNull();
	});
});
