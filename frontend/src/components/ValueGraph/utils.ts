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

function getHighestPrecedenceThreshold(
	matchingThresholds: ThresholdProps[],
	thresholds: ThresholdProps[],
): ThresholdProps | null {
	if (matchingThresholds.length === 0) {
		return null;
	}

	// whichever threshold from matchingThresholds is found first in thresholds array return the threshold from thresholds array
	let highestPrecedenceThreshold = matchingThresholds[0];
	for (let i = 1; i < matchingThresholds.length; i += 1) {
		if (
			thresholds.indexOf(matchingThresholds[i]) <
			thresholds.indexOf(highestPrecedenceThreshold)
		) {
			highestPrecedenceThreshold = matchingThresholds[i];
		}
	}

	return highestPrecedenceThreshold;
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

	const highestPrecedenceThreshold = getHighestPrecedenceThreshold(
		matchingThresholds,
		thresholds,
	);

	const isConflictingThresholds = matchingThresholds.length > 1;

	return {
		threshold: highestPrecedenceThreshold || ({} as ThresholdProps),
		isConflictingThresholds,
	};
}
