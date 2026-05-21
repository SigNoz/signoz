import { QueryData } from 'types/api/widgets/getQuery';

export function inferStepIntervalFromTimestamps(
	timestampsMs: number[],
): number | undefined {
	if (timestampsMs.length < 2) {
		return undefined;
	}

	const sorted = Array.from(new Set(timestampsMs)).sort((a, b) => a - b);
	let minDiffMs = Number.POSITIVE_INFINITY;

	for (let i = 1; i < sorted.length; i++) {
		const diff = sorted[i] - sorted[i - 1];
		if (diff > 0 && diff < minDiffMs) {
			minDiffMs = diff;
		}
	}

	if (!Number.isFinite(minDiffMs)) {
		return undefined;
	}

	const stepSeconds = Math.round(minDiffMs / 1000);
	return stepSeconds >= 1 ? stepSeconds : undefined;
}

export function inferStepIntervalFromSeries(
	seriesList: QueryData[],
): number | undefined {
	const timestamps: number[] = [];

	seriesList.forEach((series) => {
		series.values?.forEach(([timestamp]) => {
			timestamps.push(timestamp);
		});
	});

	return inferStepIntervalFromTimestamps(timestamps);
}

export function resolveBarChartStepInterval({
	metaStepIntervals,
	seriesList,
	builderStepInterval,
}: {
	metaStepIntervals: Record<string, number>;
	seriesList: QueryData[];
	builderStepInterval?: number | null;
}): number | undefined {
	const metaValues = Object.values(metaStepIntervals ?? {}).filter(
		(value) => typeof value === 'number' && Number.isFinite(value) && value > 0,
	);

	if (metaValues.length > 0) {
		return Math.min(...metaValues);
	}

	if (
		typeof builderStepInterval === 'number' &&
		builderStepInterval > 0
	) {
		return builderStepInterval;
	}

	return inferStepIntervalFromSeries(seriesList);
}
