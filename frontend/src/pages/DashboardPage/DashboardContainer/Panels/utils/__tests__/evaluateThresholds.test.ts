import type { PanelThreshold } from '../../types/threshold';
import {
	doesValueMatchThreshold,
	resolveActiveThreshold,
} from '../evaluateThresholds';

const threshold = (overrides: Partial<PanelThreshold>): PanelThreshold => ({
	color: '#f00',
	value: 100,
	operator: '>',
	...overrides,
});

describe('doesValueMatchThreshold', () => {
	it.each([
		['>', 150, 100, true],
		['>', 50, 100, false],
		['<', 50, 100, true],
		['>=', 100, 100, true],
		['<=', 100, 100, true],
		['=', 100, 100, true],
		['!=', 150, 100, true],
	] as const)('evaluates %s (%d vs %d)', (operator, value, target, expected) => {
		expect(
			doesValueMatchThreshold(value, threshold({ operator, value: target })),
		).toBe(expected);
	});

	it('never matches a threshold without an operator', () => {
		expect(doesValueMatchThreshold(150, threshold({ operator: undefined }))).toBe(
			false,
		);
	});

	it('compares the raw value when units are in different categories', () => {
		// 'bytes' vs 'ms' belong to different categories, so conversion is invalid
		// and the comparison falls back to the raw value (150 > 100).
		expect(
			doesValueMatchThreshold(150, threshold({ value: 100, unit: 'bytes' }), 'ms'),
		).toBe(true);
	});
});

describe('resolveActiveThreshold', () => {
	it('returns no threshold when none match', () => {
		const result = resolveActiveThreshold([threshold({ value: 1000 })], 10);
		expect(result.threshold).toBeNull();
		expect(result.isConflicting).toBe(false);
	});

	it('flags a conflict and picks the earliest-declared match', () => {
		const first = threshold({ color: '#aaa', operator: '>', value: 0 });
		const second = threshold({ color: '#bbb', operator: '>', value: 100 });

		const result = resolveActiveThreshold([first, second], 150);

		expect(result.isConflicting).toBe(true);
		expect(result.threshold).toBe(first);
	});

	it('returns the single matching threshold without a conflict', () => {
		const only = threshold({ color: '#abc', operator: '>', value: 100 });
		const result = resolveActiveThreshold(
			[only, threshold({ value: 9999 })],
			150,
		);

		expect(result.threshold).toBe(only);
		expect(result.isConflicting).toBe(false);
	});
});
