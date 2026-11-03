/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	MetrictypesTemporalityDTO,
	MetrictypesTypeDTO,
} from 'api/generated/services/sigNoz.schemas';

import { type MetricSeed, metricSeed } from './metrics';

/**
 * One metric per type the query builder treats differently: the type decides
 * the default time and space aggregation and which add-ons are offered.
 */
export const QUERY_BUILDER_METRICS: readonly MetricSeed[] = [
	metricSeed('signoz_calls_total', 'Calls per operation'),
	metricSeed('signoz_latency_count', 'Latency sample count'),
	metricSeed(
		'container_cpu_utilization',
		'Container CPU utilisation',
		'percent',
		MetrictypesTypeDTO.gauge,
		MetrictypesTemporalityDTO.unspecified,
	),
	metricSeed(
		'signoz_latency_bucket',
		'Latency histogram',
		'ms',
		MetrictypesTypeDTO.histogram,
	),
];
