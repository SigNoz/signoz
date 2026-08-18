import {
	ThresholdOperators,
	ThresholdProps,
} from 'container/NewWidget/RightContainer/Threshold/types';

export interface ThresholdEvalResult {
	color: string;
	label?: string;
}

/**
 * Evaluates a single comparison operation between a value and a threshold.
 * Returns true if the value satisfies the operator condition against the threshold.
 */
export function evaluateOperator(
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
 * Maps SigNoz threshold color names to CSS hex colors.
 * Threshold colors stored in the dashboard JSON use named colors like "Green", "Red", etc.
 */
const THRESHOLD_COLOR_MAP: Record<string, string> = {
	Green: '#73BF69',
	Red: '#F2495C',
	Yellow: '#FADE2A',
	Orange: '#FF9830',
	Blue: '#5794F2',
};

function resolveThresholdColor(colorName: string | undefined, defaultColor: string): string {
	if (!colorName) return defaultColor;
	return THRESHOLD_COLOR_MAP[colorName] || colorName;
}

/**
 * Evaluates a value against an ordered list of threshold rules using first-match semantics.
 * Returns the color and optional label of the first matching rule.
 * If no rule matches, returns the defaultColor with no label.
 * Handles null/NaN values by returning defaultColor immediately.
 * Skips rules with missing operator or value.
 */
export function evaluateThreshold(
	value: number | null,
	thresholds: ThresholdProps[],
	defaultColor: string,
): ThresholdEvalResult {
	if (value === null || Number.isNaN(value)) {
		return { color: defaultColor };
	}

	for (const threshold of thresholds) {
		if (threshold.thresholdValue === undefined) continue;

		const operator = threshold.thresholdOperator;
		if (!operator) continue;

		const matches = evaluateOperator(value, operator, threshold.thresholdValue);

		if (matches) {
			return {
				color: resolveThresholdColor(threshold.thresholdColor, defaultColor),
				label: threshold.thresholdLabel,
			};
		}
	}

	return { color: defaultColor };
}
