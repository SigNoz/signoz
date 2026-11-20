import {
	initialFormulaBuilderFormValues,
	initialQueriesMap,
	initialQueryAIWithType,
} from 'constants/queryBuilder';
import { getActiveBuilder } from 'lib/query/builderSlot';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryFunction } from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';

import { INITIAL_CRITICAL_THRESHOLD } from '../../context/constants';
import { Threshold } from '../../context/types';

import {
	getQueryNames,
	getSmallestDeviation,
	syncAnomalyFunction,
} from '../utils';

const timeShift: QueryFunction = { name: 'timeShift', args: [{ value: 3600 }] };
const anomaly = (
	zScoreThreshold: number,
	seasonality: string,
): QueryFunction => ({
	name: 'anomaly',
	args: [],
	namedArgs: { z_score_threshold: zScoreThreshold, seasonality },
});

describe('syncAnomalyFunction', () => {
	it('adds the anomaly function after the existing functions', () => {
		expect(
			syncAnomalyFunction([timeShift], {
				z_score_threshold: 3,
				seasonality: 'daily',
			}),
		).toStrictEqual([timeShift, anomaly(3, 'daily')]);
	});

	it('replaces stale args and gives the same result when run again', () => {
		const namedArgs = { z_score_threshold: 5, seasonality: 'weekly' };
		const synced = syncAnomalyFunction(
			[anomaly(3, 'hourly'), timeShift],
			namedArgs,
		);
		expect(synced).toStrictEqual([timeShift, anomaly(5, 'weekly')]);
		expect(syncAnomalyFunction(synced, namedArgs)).toStrictEqual(synced);
	});

	it('removes the anomaly function when no args are given', () => {
		expect(
			syncAnomalyFunction([anomaly(3, 'daily'), timeShift], undefined),
		).toStrictEqual([timeShift]);
	});
});

describe('getSmallestDeviation', () => {
	it.each([
		[[3, 2], 2],
		[['2.5', 4], 2.5],
		[[3, '', 0], 3],
		[[''], 0],
	])('picks the smallest valid deviation from %p', (values, expected) => {
		const thresholds = values.map(
			(thresholdValue) =>
				({ ...INITIAL_CRITICAL_THRESHOLD, thresholdValue }) as Threshold,
		);
		expect(getSmallestDeviation(thresholds)).toBe(expected);
	});
});

const tracesQuery = initialQueriesMap.traces;
const formula = { ...initialFormulaBuilderFormValues, queryName: 'F1' };

describe('getQueryNames', () => {
	it('lists the Query Builder queries and formulas', () => {
		const query: Query = {
			...tracesQuery,
			builder: { ...tracesQuery.builder, queryFormulas: [formula] },
		};

		expect(getQueryNames(query)).toStrictEqual([
			{ label: 'A', value: 'A' },
			{ label: 'F1', value: 'F1' },
		]);
	});

	it('lists the AI queries and formulas from the AI slot', () => {
		const query: Query = {
			...tracesQuery,
			queryType: EQueryType.AI_QUERY_BUILDER,
			builder: { ...tracesQuery.builder, queryData: [] },
			builder_ai_query: {
				...getActiveBuilder(initialQueryAIWithType),
				queryFormulas: [formula],
			},
		};

		expect(getQueryNames(query)).toStrictEqual([
			{ label: 'A', value: 'A' },
			{ label: 'F1', value: 'F1' },
		]);
	});

	it('lists nothing for an AI query whose AI slot is missing', () => {
		const query: Query = {
			...tracesQuery,
			queryType: EQueryType.AI_QUERY_BUILDER,
		};

		expect(getQueryNames(query)).toStrictEqual([]);
	});
});
