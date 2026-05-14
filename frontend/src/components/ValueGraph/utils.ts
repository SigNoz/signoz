import { evaluateThresholdWithConvertedValue } from 'container/GridTableComponent/utils';
import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';

function doesValueSatisfyThreshold(
	rawValue: number,
	threshold: ThresholdProps,
	yAxisUnit?: string,
): boolean {
	if (
		threshold.thresholdOperator === undefined ||
		threshold.thresholdValue === undefined
	) {
		return false;
	}

	return evaluateThresholdWithConvertedValue(
		rawValue,
		threshold.thresholdValue,
		threshold.thresholdOperator,
		threshold.thresholdUnit,
		yAxisUnit,
	);
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
	yAxisUnit?: string,
): {
	threshold: ThresholdProps;
	isConflictingThresholds: boolean;
} {
	const matchingThresholds = thresholds.filter((threshold) => {
		const numbers = extractNumbersFromString(rawValue.toString());
		if (numbers.length === 0) {
			return false;
		}
		return doesValueSatisfyThreshold(numbers[0], threshold, yAxisUnit);
	});

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
