import {
	initialQueryBuilderFormValues,
	initialQueryWithType,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { getOperatorsBySourceAndPanelType } from 'lib/newQueryBuilder/getOperatorsBySourceAndPanelType';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

export const CURRENT_TRACES_EXPLORER_TAB = 'currentTab';

export enum TracesExplorerTabs {
	TIME_SERIES = 'times-series',
	TRACES = 'traces',
}

export const initialTracesQuery: Query = {
	...initialQueryWithType,
	builder: {
		...initialQueryWithType.builder,
		queryData: [
			{
				...initialQueryBuilderFormValues,
				dataSource: DataSource.TRACES,
				aggregateOperator: getOperatorsBySourceAndPanelType({
					dataSource: DataSource.TRACES,
					panelType: PANEL_TYPES.TIME_SERIES,
				})[0].value,
			},
		],
	},
};
