import type {
	Querybuildertypesv5DistributionDataDTO,
	Querybuildertypesv5DistributionDTO,
} from 'api/generated/services/sigNoz.schemas';
import getLabelName from 'lib/getLabelName';
import type { DistributionSeries } from 'lib/visualization/charts/Distribution/types';

export interface DistributionPanelData {
	/** Ascending bucket upper bounds shared by every group; empty means no chart. */
	buckets: number[];
	series: DistributionSeries[];
}

const EMPTY_DATA: DistributionPanelData = { buckets: [], series: [] };

/**
 * V5 distribution results → the chart's `buckets` + `series`. Only the first
 * aggregation carrying bounds is read: each has its own bucket axis, and the chart
 * has one.
 */
export function prepareDistributionData({
	results,
	legendMap,
}: {
	results: Querybuildertypesv5DistributionDataDTO[];
	legendMap: Record<string, string>;
}): DistributionPanelData {
	for (const result of results) {
		const queryName = result.queryName ?? '';
		for (const aggregation of result.aggregations ?? []) {
			const buckets = aggregation.meta?.buckets;
			if (!buckets?.length) {
				continue;
			}
			return {
				buckets,
				series: (aggregation.distributions ?? []).map((distribution) =>
					toDistributionSeries(
						distribution,
						buckets.length + 1,
						queryName,
						legendMap[queryName] ?? '',
					),
				),
			};
		}
	}

	return EMPTY_DATA;
}

/** Pads or trims to `length` so every series lines up with the bucket axis. */
function toDistributionSeries(
	distribution: Querybuildertypesv5DistributionDTO,
	length: number,
	queryName: string,
	legend: string,
): DistributionSeries {
	const record: Record<string, string> = {};
	(distribution.labels ?? []).forEach((label) => {
		if (label.key?.name) {
			record[label.key.name] = String(label.value);
		}
	});

	const counts = distribution.counts ?? [];
	return {
		label: getLabelName(record, queryName, legend),
		counts: Array.from({ length }, (_, index) => {
			const count = counts[index];
			return Number.isFinite(count) ? count : 0;
		}),
	};
}
