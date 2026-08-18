// Feature: state-timeline-panel, Property 4: Threshold evaluation applies first-match semantics with correct operator evaluation
// **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

import * as fc from 'fast-check';
import {
	ThresholdOperators,
	ThresholdProps,
} from 'container/NewWidget/RightContainer/Threshold/types';
import { PANEL_TYPES } from 'constants/queryBuilder';

import { evaluateOperator, evaluateThreshold } from '../evaluateThreshold';

const DEFAULT_COLOR = '#9CA3AF';

const OPERATORS: ThresholdOperators[] = ['>', '<', '>=', '<=', '='];

/**
 * Helper: manually evaluate an operator condition (reference implementation)
 * to cross-check against the evaluateOperator function under test.
 */
function referenceEvaluateOperator(
	value: number,
	operator: ThresholdOperators,
	threshold: number,
): boolean {
	switch (operator) {
		case '>':
			return value > threshold;
		case '<':
			return value < threshold;
		case '>=':
			return value >= threshold;
		case '<=':
			return value <= threshold;
		case '=':
			return value === threshold;
		default:
			return false;
	}
}

/**
 * Arbitrary: generates a valid ThresholdOperators value.
 */
const operatorArb = fc.constantFrom<ThresholdOperators>(...OPERATORS);

/**
 * Arbitrary: generates a hex color string.
 */
const hexCharArb = fc.constantFrom(
	...'0123456789abcdef'.split(''),
);
const colorArb = fc
	.array(hexCharArb, { minLength: 6, maxLength: 6 })
	.map((chars) => `#${chars.join('')}`);

/**
 * Arbitrary: generates an optional threshold label.
 */
const labelArb = fc.option(fc.string({ minLength: 1, maxLength: 20 }), {
	nil: undefined,
});

/**
 * Arbitrary: generates a valid ThresholdProps with defined operator and value.
 */
function thresholdRuleArb(keyIndex: number): fc.Arbitrary<ThresholdProps> {
	return fc.record({
		operator: operatorArb,
		value: fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
		color: colorArb,
		label: labelArb,
	}).map(({ operator, value, color, label }) => ({
		index: String(keyIndex),
		keyIndex,
		thresholdOperator: operator,
		thresholdValue: value,
		thresholdColor: color,
		thresholdLabel: label,
		moveThreshold: jest.fn(),
		selectedGraph: PANEL_TYPES.STATE_TIMELINE,
	}));
}

/**
 * Arbitrary: generates a list of 1-10 valid threshold rules.
 */
const thresholdListArb = fc
	.integer({ min: 1, max: 10 })
	.chain((count) =>
		fc.tuple(
			...Array.from({ length: count }, (_, i) => thresholdRuleArb(i)),
		),
	)
	.map((arr) => arr as ThresholdProps[]);

describe('Property 4: Threshold evaluation applies first-match semantics with correct operator evaluation', () => {
	describe('evaluateOperator properties', () => {
		it('should match the reference implementation for all operators and values', () => {
			fc.assert(
				fc.property(
					fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
					operatorArb,
					fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
					(value, operator, threshold) => {
						const result = evaluateOperator(value, operator, threshold);
						const expected = referenceEvaluateOperator(value, operator, threshold);
						expect(result).toBe(expected);
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	describe('evaluateThreshold first-match semantics', () => {
		it('should return the color and label of the first matching rule', () => {
			fc.assert(
				fc.property(
					fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
					thresholdListArb,
					(value, thresholds) => {
						const result = evaluateThreshold(value, thresholds, DEFAULT_COLOR);

						// Find the first rule that matches manually
						let expectedColor = DEFAULT_COLOR;
						let expectedLabel: string | undefined;

						for (const rule of thresholds) {
							if (rule.thresholdValue === undefined) continue;
							if (!rule.thresholdOperator) continue;

							const matches = referenceEvaluateOperator(
								value,
								rule.thresholdOperator,
								rule.thresholdValue,
							);

							if (matches) {
								expectedColor = rule.thresholdColor ?? DEFAULT_COLOR;
								expectedLabel = rule.thresholdLabel;
								break;
							}
						}

						expect(result.color).toBe(expectedColor);
						expect(result.label).toBe(expectedLabel);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('should return default color when no threshold matches', () => {
			fc.assert(
				fc.property(
					fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
					thresholdListArb,
					colorArb,
					(value, thresholds, defaultColor) => {
						// Modify all thresholds so none match: set operator to '>' and value above input
						const nonMatchingThresholds: ThresholdProps[] = thresholds.map(
							(t, i) => ({
								...t,
								keyIndex: i,
								index: String(i),
								thresholdOperator: '>' as ThresholdOperators,
								thresholdValue: value + 1 + Math.abs(value),
							}),
						);

						const result = evaluateThreshold(
							value,
							nonMatchingThresholds,
							defaultColor,
						);

						expect(result.color).toBe(defaultColor);
						expect(result.label).toBeUndefined();
					},
				),
				{ numRuns: 100 },
			);
		});

		it('should return default color for null values regardless of thresholds', () => {
			fc.assert(
				fc.property(thresholdListArb, colorArb, (thresholds, defaultColor) => {
					const result = evaluateThreshold(null, thresholds, defaultColor);
					expect(result.color).toBe(defaultColor);
					expect(result.label).toBeUndefined();
				}),
				{ numRuns: 100 },
			);
		});

		it('should return default color for NaN values regardless of thresholds', () => {
			fc.assert(
				fc.property(thresholdListArb, colorArb, (thresholds, defaultColor) => {
					const result = evaluateThreshold(NaN, thresholds, defaultColor);
					expect(result.color).toBe(defaultColor);
					expect(result.label).toBeUndefined();
				}),
				{ numRuns: 100 },
			);
		});

		it('should skip rules with missing thresholdValue and match subsequent rules', () => {
			fc.assert(
				fc.property(
					fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
					thresholdListArb,
					(value, thresholds) => {
						// Insert a rule with undefined thresholdValue at position 0
						const invalidRule: ThresholdProps = {
							index: 'invalid',
							keyIndex: -1,
							thresholdOperator: '>',
							thresholdValue: undefined,
							thresholdColor: '#FFFFFF',
							thresholdLabel: 'ShouldBeSkipped',
							moveThreshold: jest.fn(),
							selectedGraph: PANEL_TYPES.STATE_TIMELINE,
						};

						const modifiedThresholds = [invalidRule, ...thresholds];
						const resultWithInvalid = evaluateThreshold(
							value,
							modifiedThresholds,
							DEFAULT_COLOR,
						);
						const resultWithout = evaluateThreshold(
							value,
							thresholds,
							DEFAULT_COLOR,
						);

						// The invalid rule should be skipped, so results should be identical
						expect(resultWithInvalid.color).toBe(resultWithout.color);
						expect(resultWithInvalid.label).toBe(resultWithout.label);
					},
				),
				{ numRuns: 100 },
			);
		});
	});
});
