import { resolveSpanGaps } from '../resolvers';

describe('resolveSpanGaps', () => {
	it('spans all gaps (true) when unset', () => {
		expect(resolveSpanGaps(undefined)).toBe(true);
		expect(resolveSpanGaps('')).toBe(true);
	});

	it('parses a duration string into seconds', () => {
		expect(resolveSpanGaps('5s')).toBe(5);
		expect(resolveSpanGaps('10m')).toBe(600);
		expect(resolveSpanGaps('1h')).toBe(3600);
	});

	it('tolerates a bare seconds number (back-compat)', () => {
		expect(resolveSpanGaps('600')).toBe(600);
	});

	it('falls back to true for unparseable input', () => {
		expect(resolveSpanGaps('abc')).toBe(true);
	});
});
