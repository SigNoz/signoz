import { Time } from 'container/TopNav/DateTimeSelection/config';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import {
	BuilderClickHouseResource,
	BuilderPromQLResource,
	BuilderQueryDataResourse,
	IClickHouseQuery,
	IPromQLQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

export const prepareStagedQuery = (
	t: EQueryType,
	b: BuilderQueryDataResourse,
	p: BuilderPromQLResource,
	c: BuilderClickHouseResource,
): Query => {
	const promList: IPromQLQuery[] = [];
	const chQueryList: IClickHouseQuery[] = [];

	const builder = mapQueryDataFromApi(b);
	if (p) {
		Object.keys(p).forEach((key) => {
			promList.push({ ...p[key], name: key });
		});
	}
	if (c) {
		Object.keys(c).forEach((key) => {
			chQueryList.push({ ...c[key], name: key, rawQuery: c[key].query });
		});
	}

	return {
		queryType: t,
		promql: promList,
		builder,
		clickhouse_sql: chQueryList,
	};
};

// toChartInterval converts eval window to chart selection time interval
export const toChartInterval = (evalWindow: string | undefined): Time => {
	switch (evalWindow) {
		case '5m0s':
			return '5min';
		case '10m0s':
			return '10min';
		case '15m0s':
			return '15min';
		case '30m0s':
			return '30min';
		case '1h0m0s':
			return '1hr';
		case '4h0m0s':
			return '4hr';
		case '24h0m0s':
			return '1day';
		default:
			return '5min';
	}
};
