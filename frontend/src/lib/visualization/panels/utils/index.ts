import { normalizePlotValue } from 'lib/uPlotV2/utils/dataUtils';
import { QueryData } from 'types/api/widgets/getQuery';

export function getXAxisTimestamps(seriesList: QueryData[]): number[] {
	const timestamps = new Set<number>();

	seriesList.forEach((series: { values?: [number, string][] }) => {
		if (series?.values) {
			series.values.forEach((value) => {
				timestamps.add(value[0]);
			});
		}
	});

	const timestampsArr = Array.from(timestamps);
	timestampsArr.sort((a, b) => a - b);

	return timestampsArr;
}

export function fillMissingXAxisTimestamps(
	timestampArr: number[],
	data: Array<{ values?: [number, string][] }>,
): (number | null)[][] {
	// Ensure we work with a sorted, de‑duplicated list of x-axis timestamps
	const canonicalTimestamps = Array.from(new Set(timestampArr)).sort(
		(a, b) => a - b,
	);

	return data.map(({ values }) =>
		buildSeriesYValues(canonicalTimestamps, values),
	);
}

function buildSeriesYValues(
	timestamps: number[],
	values?: [number, string][],
): (number | null)[] {
	if (!values?.length) {
		return [];
	}

	const valueByTimestamp = new Map<number, number | null>();

	for (let i = 0; i < values.length; i++) {
		const [timestamp, rawValue] = values[i];
		valueByTimestamp.set(timestamp, normalizePlotValue(rawValue));
	}

	return timestamps.map((timestamp) => {
		const value = valueByTimestamp.get(timestamp);
		return value !== undefined ? value : null;
	});
}
