/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	MetrictypesTemporalityDTO,
	MetrictypesTypeDTO,
	type GetMetricMetadata200,
	type ListMetrics200,
} from 'api/generated/services/sigNoz.schemas';

/**
 * A metric as the catalogue endpoints describe it. Anywhere a metric name is
 * typed, whether in the query builder's aggregation field or a panel's unit
 * seed, reads it from here.
 */
export interface MetricSeed {
	metricName: string;
	description: string;
	type: MetrictypesTypeDTO;
	temporality: MetrictypesTemporalityDTO;
	unit: string;
}

export const metricSeed = (
	metricName: string,
	description: string,
	unit = '',
	type = MetrictypesTypeDTO.sum,
	temporality = MetrictypesTemporalityDTO.cumulative,
): MetricSeed => ({ metricName, description, type, unit, temporality });

/** Sums are monotonic; gauges and histograms are not. */
const isMonotonic = (seed: MetricSeed): boolean =>
	seed.type === MetrictypesTypeDTO.sum;

export const listMetricsResponse = (
	seeds: readonly MetricSeed[],
	searchText = '',
): ListMetrics200 => {
	const search = searchText.toLowerCase();

	return {
		status: 'success',
		data: {
			metrics: seeds
				.filter((seed) => seed.metricName.toLowerCase().includes(search))
				.map((seed) => ({ ...seed, isMonotonic: isMonotonic(seed) })),
		},
	};
};

export const metricMetadataResponse = (
	seeds: readonly MetricSeed[],
	metricName: string,
): GetMetricMetadata200 => {
	const seed =
		seeds.find((candidate) => candidate.metricName === metricName) ?? seeds[0];

	return {
		status: 'success',
		data: {
			description: seed.description,
			type: seed.type,
			unit: seed.unit,
			temporality: seed.temporality,
			isMonotonic: isMonotonic(seed),
		},
	};
};
