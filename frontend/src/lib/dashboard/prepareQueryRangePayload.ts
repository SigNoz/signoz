import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import getStep from 'lib/getStep';
import { mapQueryDataToApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataToApi';
import { isUndefined } from 'lodash-es';
import store from 'store';
import { QueryRangePayload } from 'types/api/metrics/getQueryRange';
import { EQueryType } from 'types/common/dashboard';

import { GetQueryResultsProps } from './getQueryResults';

type PrepareQueryRangePayload = {
	queryPayload: QueryRangePayload;
	legendMap: Record<string, string>;
};

export const prepareQueryRangePayload = ({
	query,
	globalSelectedInterval,
	graphType,
	formatForWeb,
	selectedTime,
	tableParams,
	variables = {},
	params = {},
	fillGaps = false,
	start: startTime,
	end: endTime,
}: GetQueryResultsProps): PrepareQueryRangePayload => {
	let legendMap: Record<string, string> = {};
	const {
		allowSelectedIntervalForStepGen,
		lastLogLineTimestamp,
		...restParams
	} = params;

	const compositeQuery: QueryRangePayload['compositeQuery'] = {
		queryType: query.queryType,
		panelType: graphType,
		fillGaps,
	};

	switch (query.queryType) {
		case EQueryType.QUERY_BUILDER: {
			const { queryData: data, queryFormulas } = query.builder;
			const currentQueryData = mapQueryDataToApi(data, 'queryName', tableParams);
			const currentFormulas = mapQueryDataToApi(queryFormulas, 'queryName');

			const builderQueries = {
				...currentQueryData.data,
				...currentFormulas.data,
			};
			legendMap = {
				...currentQueryData.newLegendMap,
				...currentFormulas.newLegendMap,
			};

			compositeQuery.builderQueries = builderQueries;
			break;
		}
		case EQueryType.CLICKHOUSE: {
			const chQueries = query[query.queryType].reduce((acc, query) => {
				if (!query.query) return acc;

				acc[query.name] = query;

				legendMap[query.name] = query.legend;

				return acc;
			}, {} as NonNullable<QueryRangePayload['compositeQuery']['chQueries']>);

			compositeQuery.chQueries = chQueries;

			break;
		}
		case EQueryType.PROM: {
			// eslint-disable-next-line sonarjs/no-identical-functions
			const promQueries = query[query.queryType].reduce((acc, query) => {
				if (!query.query) return acc;

				acc[query.name] = query;

				legendMap[query.name] = query.legend;

				return acc;
			}, {} as NonNullable<QueryRangePayload['compositeQuery']['promQueries']>);

			compositeQuery.promQueries = promQueries;
			break;
		}

		default:
			break;
	}

	const { start, end } = getStartEndRangeTime({
		type: selectedTime,
		interval: globalSelectedInterval,
	});

	const endLogTimeStamp = !isUndefined(lastLogLineTimestamp)
		? new Date(lastLogLineTimestamp as string | number)?.getTime() || undefined
		: undefined;

	const queryPayload: QueryRangePayload = {
		start: startTime ? startTime * 1e3 : parseInt(start, 10) * 1e3,
		end: endTime ? endTime * 1e3 : endLogTimeStamp || parseInt(end, 10) * 1e3,
		step: getStep({
			start: allowSelectedIntervalForStepGen
				? start
				: store.getState().globalTime.minTime,
			end: allowSelectedIntervalForStepGen
				? end
				: store.getState().globalTime.maxTime,
			inputFormat: 'ns',
		}),
		variables,
		formatForWeb,
		compositeQuery,
		...restParams,
	};

	return { legendMap, queryPayload };
};
