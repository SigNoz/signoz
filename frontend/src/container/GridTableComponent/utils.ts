import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';

// Helper function to evaluate the condition based on the operator
function evaluateCondition(
	operator: string | undefined,
	value: number,
	thresholdValue: number,
): boolean {
	switch (operator) {
		case '>':
			return value > thresholdValue;
		case '<':
			return value < thresholdValue;
		case '>=':
			return value >= thresholdValue;
		case '<=':
			return value <= thresholdValue;
		case '==':
			return value === thresholdValue;
		default:
			return false;
	}
}

export function findMatchingThreshold(
	thresholds: ThresholdProps[],
	label: string,
	value: number,
): {
	threshold: ThresholdProps;
	hasMultipleMatches: boolean;
} {
	const matchingThresholds: ThresholdProps[] = [];
	let hasMultipleMatches = false;

	thresholds.forEach((threshold) => {
		if (
			threshold.thresholdValue !== undefined &&
			threshold.thresholdTableOptions === label &&
			evaluateCondition(
				threshold.thresholdOperator,
				value,
				threshold.thresholdValue,
			)
		) {
			matchingThresholds.push(threshold);
		}
	});

	if (matchingThresholds.length > 1) {
		hasMultipleMatches = true;
	}

	return {
		threshold: matchingThresholds[0],
		hasMultipleMatches,
	};
}
