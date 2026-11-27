/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { initialQueriesMap } from 'constants/queryBuilder';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { groupByKey, queryWith } from '../QueryBuilderV2.stories.mocks';

/** Every traces add-on holding one short value. */
export const tracesFewAddOns: Query = queryWith(initialQueriesMap.traces, {
	groupBy: [groupByKey('service.name', 'resource')],
	having: { expression: 'count() > 10' },
	orderBy: [{ columnName: 'count()', order: 'desc' }],
	limit: 10,
	legend: '{{service.name}}',
});

/** Every traces add-on filled past one line, so group by and order by wrap. */
export const tracesManyAddOns: Query = queryWith(initialQueriesMap.traces, {
	groupBy: [
		groupByKey('service.name', 'resource'),
		groupByKey('deployment.environment', 'resource'),
		groupByKey('host.name', 'resource'),
		groupByKey('name', ''),
		groupByKey('http.method'),
		groupByKey('http.route'),
		groupByKey('response_status_code'),
		groupByKey('rpc.method'),
		groupByKey('hasError', '', DataTypes.bool),
	],
	having: {
		expression: 'count() > 10 AND count() < 5000 AND count() != 250',
	},
	orderBy: [
		{ columnName: 'count()', order: 'desc' },
		{ columnName: 'service.name', order: 'asc' },
		{ columnName: 'http.route', order: 'asc' },
	],
	limit: 100,
	legend:
		'{{service.name}} {{deployment.environment}} {{http.method}} {{http.route}}',
});

const histogramWith = (keys: string[]): Query =>
	queryWith(initialQueriesMap.metrics, {
		aggregations: [
			{
				metricName: 'signoz_latency_bucket',
				temporality: '',
				timeAggregation: '',
				spaceAggregation: 'p90',
				reduceTo: undefined,
			},
		],
		groupBy: keys.map((key) => groupByKey(key)),
	});

/** A histogram grouped by one key in the aggregation row. */
export const metricsFewGroupBy: Query = histogramWith(['service_name']);

/** A histogram grouped by enough keys to wrap the aggregation row's select. */
export const metricsManyGroupBy: Query = histogramWith([
	'service_name',
	'operation',
	'status_code',
	'le',
	'resource_deployment.environment',
	'resource_host.name',
	'resource_k8s.cluster.name',
]);
