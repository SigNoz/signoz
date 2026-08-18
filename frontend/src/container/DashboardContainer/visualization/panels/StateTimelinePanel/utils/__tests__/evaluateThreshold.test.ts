import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import { PANEL_TYPES } from 'constants/queryBuilder';

import { evaluateOperator, evaluateThreshold } from '../evaluateThreshold';

const DEFAULT_COLOR = '#9CA3AF';

function makeThreshold(
	overrides: Partial<ThresholdProps> & { keyIndex: number },
): ThresholdProps {
	return {
		index: String(overrides.keyIndex),
		moveThreshold: jest.fn(),
		selectedGraph: PANEL_TYPES.STATE_TIMELINE,
		...overrides,
	};
}

describe('evaluateOperator', () => {
	it('evaluates > correctly', () => {
		expect(evaluateOperator(10, '>', 5)).toBe(true);
		expect(evaluateOperator(5, '>', 5)).toBe(false);
		expect(evaluateOperator(3, '>', 5)).toBe(false);
	});

	it('evaluates < correctly', () => {
		expect(evaluateOperator(3, '<', 5)).toBe(true);
		expect(evaluateOperator(5, '<', 5)).toBe(false);
		expect(evaluateOperator(10, '<', 5)).toBe(false);
	});

	it('evaluates >= correctly', () => {
		expect(evaluateOperator(10, '>=', 5)).toBe(true);
		expect(evaluateOperator(5, '>=', 5)).toBe(true);
		expect(evaluateOperator(3, '>=', 5)).toBe(false);
	});

	it('evaluates <= correctly', () => {
		expect(evaluateOperator(3, '<=', 5)).toBe(true);
		expect(evaluateOperator(5, '<=', 5)).toBe(true);
		expect(evaluateOperator(10, '<=', 5)).toBe(false);
	});

	it('evaluates = correctly', () => {
		expect(evaluateOperator(5, '=', 5)).toBe(true);
		expect(evaluateOperator(4, '=', 5)).toBe(false);
	});

	it('returns false for unknown operator', () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect(evaluateOperator(5, 'unknown' as any, 5)).toBe(false);
	});
});

describe('evaluateThreshold', () => {
	it('returns defaultColor for null value', () => {
		const thresholds = [
			makeThreshold({
				keyIndex: 0,
				thresholdOperator: '>',
				thresholdValue: 0,
				thresholdColor: '#FF0000',
			}),
		];

		const result = evaluateThreshold(null, thresholds, DEFAULT_COLOR);
		expect(result).toStrictEqual({ color: DEFAULT_COLOR });
	});

	it('returns defaultColor for NaN value', () => {
		const thresholds = [
			makeThreshold({
				keyIndex: 0,
				thresholdOperator: '>',
				thresholdValue: 0,
				thresholdColor: '#FF0000',
			}),
		];

		const result = evaluateThreshold(NaN, thresholds, DEFAULT_COLOR);
		expect(result).toStrictEqual({ color: DEFAULT_COLOR });
	});

	it('returns first matching threshold color and label', () => {
		const thresholds = [
			makeThreshold({
				keyIndex: 0,
				thresholdOperator: '>',
				thresholdValue: 80,
				thresholdColor: '#FF0000',
				thresholdLabel: 'Critical',
			}),
			makeThreshold({
				keyIndex: 1,
				thresholdOperator: '>',
				thresholdValue: 50,
				thresholdColor: '#FFAA00',
				thresholdLabel: 'Warning',
			}),
		];

		const result = evaluateThreshold(90, thresholds, DEFAULT_COLOR);
		expect(result).toStrictEqual({ color: '#FF0000', label: 'Critical' });
	});

	it('applies first-match semantics and returns second rule when first does not match', () => {
		const thresholds = [
			makeThreshold({
				keyIndex: 0,
				thresholdOperator: '>',
				thresholdValue: 80,
				thresholdColor: '#FF0000',
				thresholdLabel: 'Critical',
			}),
			makeThreshold({
				keyIndex: 1,
				thresholdOperator: '>',
				thresholdValue: 50,
				thresholdColor: '#FFAA00',
				thresholdLabel: 'Warning',
			}),
		];

		const result = evaluateThreshold(60, thresholds, DEFAULT_COLOR);
		expect(result).toStrictEqual({ color: '#FFAA00', label: 'Warning' });
	});

	it('returns defaultColor when no threshold matches', () => {
		const thresholds = [
			makeThreshold({
				keyIndex: 0,
				thresholdOperator: '>',
				thresholdValue: 80,
				thresholdColor: '#FF0000',
			}),
		];

		const result = evaluateThreshold(50, thresholds, DEFAULT_COLOR);
		expect(result).toStrictEqual({ color: DEFAULT_COLOR });
	});

	it('returns defaultColor when thresholds array is empty', () => {
		const result = evaluateThreshold(50, [], DEFAULT_COLOR);
		expect(result).toStrictEqual({ color: DEFAULT_COLOR });
	});

	it('skips rules with missing thresholdValue', () => {
		const thresholds = [
			makeThreshold({
				keyIndex: 0,
				thresholdOperator: '>',
				thresholdValue: undefined,
				thresholdColor: '#FF0000',
				thresholdLabel: 'Should be skipped',
			}),
			makeThreshold({
				keyIndex: 1,
				thresholdOperator: '<',
				thresholdValue: 100,
				thresholdColor: '#00FF00',
				thresholdLabel: 'OK',
			}),
		];

		const result = evaluateThreshold(50, thresholds, DEFAULT_COLOR);
		expect(result).toStrictEqual({ color: '#00FF00', label: 'OK' });
	});

	it('skips rules with missing operator', () => {
		const thresholds = [
			makeThreshold({
				keyIndex: 0,
				thresholdOperator: undefined,
				thresholdValue: 50,
				thresholdColor: '#FF0000',
				thresholdLabel: 'Should be skipped',
			}),
			makeThreshold({
				keyIndex: 1,
				thresholdOperator: '=',
				thresholdValue: 50,
				thresholdColor: '#00FF00',
				thresholdLabel: 'Exact',
			}),
		];

		const result = evaluateThreshold(50, thresholds, DEFAULT_COLOR);
		expect(result).toStrictEqual({ color: '#00FF00', label: 'Exact' });
	});

	it('uses defaultColor when matching threshold has no color', () => {
		const thresholds = [
			makeThreshold({
				keyIndex: 0,
				thresholdOperator: '>',
				thresholdValue: 0,
				thresholdColor: undefined,
				thresholdLabel: 'No color',
			}),
		];

		const result = evaluateThreshold(10, thresholds, DEFAULT_COLOR);
		expect(result).toStrictEqual({ color: DEFAULT_COLOR, label: 'No color' });
	});

	it('returns result without label when threshold has no label', () => {
		const thresholds = [
			makeThreshold({
				keyIndex: 0,
				thresholdOperator: '>',
				thresholdValue: 0,
				thresholdColor: '#FF0000',
			}),
		];

		const result = evaluateThreshold(10, thresholds, DEFAULT_COLOR);
		expect(result).toStrictEqual({ color: '#FF0000', label: undefined });
	});

	it('handles thresholdValue of 0 correctly', () => {
		const thresholds = [
			makeThreshold({
				keyIndex: 0,
				thresholdOperator: '=',
				thresholdValue: 0,
				thresholdColor: '#0000FF',
				thresholdLabel: 'Zero',
			}),
		];

		const result = evaluateThreshold(0, thresholds, DEFAULT_COLOR);
		expect(result).toStrictEqual({ color: '#0000FF', label: 'Zero' });
	});
});
