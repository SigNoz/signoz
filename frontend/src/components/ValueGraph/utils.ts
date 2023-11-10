import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
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

function extractNumbersFromString(inputString: string): number[] {
	const regex = /[+-]?\d+(\.\d+)?/g;
	const matches = inputString.match(regex);

	if (matches) {
		return matches.map(Number);
	}

	return [];
}

export function getBackgroundColorAndThresholdCheck(
	thresholds: ThresholdProps[],
	rawValue: number,
): {
	threshold: ThresholdProps;
	isConflictingThresholds: boolean;
} {
	const matchingThresholds = thresholds.filter((threshold) =>
		compareThreshold(
			extractNumbersFromString(
				getYAxisFormattedValue(rawValue.toString(), threshold.thresholdUnit || ''),
			)[0],
			threshold,
		),
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
