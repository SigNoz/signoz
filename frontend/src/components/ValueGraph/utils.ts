import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';

function compareThreshold(
	rawValue: number,
	threshold: ThresholdProps,
): boolean {
	if (
		threshold.thresholdOperator === undefined ||
		threshold.thresholdValue === undefined
	) {
		return false;
	}
	switch (threshold.thresholdOperator) {
		case '>':
			return rawValue > threshold.thresholdValue;
		case '>=':
			return rawValue >= threshold.thresholdValue;
		case '<':
			return rawValue < threshold.thresholdValue;
		case '<=':
			return rawValue <= threshold.thresholdValue;
		case '=':
			return rawValue === threshold.thresholdValue;
		default:
			return false;
	}
}

export function getBackgroundColorAndThresholdCheck(
	thresholds: ThresholdProps[],
	rawValue: number,
): {
	threshold: ThresholdProps;
	isConflictingThresholds: boolean;
} {
	const matchingThresholds = thresholds.filter((threshold) =>
		compareThreshold(rawValue, threshold),
	);

	if (matchingThresholds.length === 0) {
		return {
			threshold: {} as ThresholdProps,
			isConflictingThresholds: false,
		};
	}

	const newThreshold = matchingThresholds.reduce((prev, curr) =>
		// Assuming index is a string, you might want to convert it to a comparable type
		parseFloat(curr.index) > parseFloat(prev.index) ? curr : prev,
	);

	const isConflictingThresholds = matchingThresholds.length > 1;

	return {
		threshold: newThreshold,
		isConflictingThresholds,
	};
}
