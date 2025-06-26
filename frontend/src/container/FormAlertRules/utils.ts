import { SelectProps } from 'antd';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import getStep from 'lib/getStep';
import {
	IBuilderFormula,
	IBuilderQuery,
	IClickHouseQuery,
	IPromQLQuery,
} from 'types/api/queryBuilder/queryBuilderData';

// toChartInterval converts eval window to chart selection time interval
export const toChartInterval = (evalWindow: string | undefined): Time => {
	switch (evalWindow) {
		case '1m0s':
			return '1m';
		case '5m0s':
			return '5m';
		case '10m0s':
			return '10m';
		case '15m0s':
			return '15m';
		case '30m0s':
			return '30m';
		case '1h0m0s':
			return '1h';
		case '3h0m0s':
			return '3h';
		case '4h0m0s':
			return '4h';
		case '6h0m0s':
			return '6h';
		case '12h0m0s':
			return '12h';
		case '24h0m0s':
			return '1d';
		default:
			return '5m';
	}
};

export const getUpdatedStepInterval = (evalWindow?: string): number => {
	const { start, end } = getStartEndRangeTime({
		type: 'GLOBAL_TIME',
		interval: toChartInterval(evalWindow),
	});
	return getStep({
		start,
		end,
		inputFormat: 'ns',
	});
};

export const getSelectedQueryOptions = (
	queries: Array<
		IBuilderQuery | IBuilderFormula | IClickHouseQuery | IPromQLQuery
	>,
): SelectProps['options'] =>
	queries
		.filter((query) => !query.disabled)
		.map((query) => ({
			label: 'queryName' in query ? query.queryName : query.name,
			value: 'queryName' in query ? query.queryName : query.name,
		}));
