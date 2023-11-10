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
	bgColor: string;
	isConflictingThresholds: boolean;
} {
	const matchingThresholds = thresholds.filter((threshold) =>
		compareThreshold(rawValue, threshold),
	);

	if (matchingThresholds.length === 0) {
		return {
			bgColor: '',
			isConflictingThresholds: false,
		};
	}

	const backgroundColorThreshold = matchingThresholds.reduce((prev, curr) =>
		curr.index > prev.index ? curr : prev,
	);

	const isConflictingThresholds = matchingThresholds.length > 1;

	return {
		bgColor: backgroundColorThreshold.thresholdColor || '',
		isConflictingThresholds,
	};
}
