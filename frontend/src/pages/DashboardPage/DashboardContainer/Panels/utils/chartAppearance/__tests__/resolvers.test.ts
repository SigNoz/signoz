import { resolveSpanGaps } from '../resolvers';

describe('resolveSpanGaps', () => {
	it('parses a duration string into seconds when thresholding', () => {
		expect(resolveSpanGaps({ fillOnlyBelow: true, fillLessThan: '5s' })).toBe(5);
		expect(resolveSpanGaps({ fillOnlyBelow: true, fillLessThan: '10m' })).toBe(
			600,
		);
		expect(resolveSpanGaps({ fillOnlyBelow: true, fillLessThan: '1h' })).toBe(
			3600,
		);
	});

	it('tolerates a bare seconds number (back-compat)', () => {
		expect(resolveSpanGaps({ fillOnlyBelow: true, fillLessThan: '600' })).toBe(
			600,
		);
	});

	it('falls back to true for unparseable input', () => {
		expect(resolveSpanGaps({ fillOnlyBelow: true, fillLessThan: 'abc' })).toBe(
			true,
		);
	});

	it('spans all gaps when fillOnlyBelow is explicitly false, ignoring any duration', () => {
		expect(resolveSpanGaps({ fillOnlyBelow: false, fillLessThan: '5m' })).toBe(
			true,
		);
	});

	it('treats a duration with no fillOnlyBelow flag as a threshold (legacy panels)', () => {
		expect(resolveSpanGaps({ fillLessThan: '5m' })).toBe(300);
	});
});
