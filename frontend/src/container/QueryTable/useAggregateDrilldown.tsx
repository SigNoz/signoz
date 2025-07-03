import { QueryParams } from 'constants/query';
import { OPERATORS } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { CustomDataColumnType } from 'container/GridTableComponent/utils';
import {
	addFilterToQuery,
	FilterData,
} from 'container/QueryTable/drilldownUtils';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import createQueryParams from 'lib/createQueryParams';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { useCallback, useMemo } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import {
	ConfigType,
	ContextMenuItem,
	getContextMenuConfig,
} from './contextConfig';

interface ClickedData {
	record: RowData;
	column: CustomDataColumnType<RowData>;
}

const getRoute = (key: string): string => {
	switch (key) {
		case 'view_logs':
			return ROUTES.LOGS_EXPLORER;
		case 'view_metrics':
			return ROUTES.METRICS_EXPLORER;
		case 'view_traces':
			return ROUTES.TRACES_EXPLORER;
		default:
			return '';
	}
};

const useAggregateDrilldown = ({
	query,
	widgetId,
	clickedData,
	onClose,
}: {
	query: Query;
	widgetId: string;
	clickedData: ClickedData | null;
	onClose: () => void;
}): {
	aggregateDrilldownConfig: { header?: string; items?: ContextMenuItem };
} => {
	const { safeNavigate } = useSafeNavigate();

	// const isEmptyFilterValue = (value: any) => {
	//     return value === '' || value === null || value === undefined || value === 'n/a';
	// }

	const handleAggregateDrilldown = useCallback(
		(key: string): void => {
			// TODO: Implement aggregate drilldown logic
			console.log('Aggregate drilldown:', { clickedData, widgetId, query, key });

			const route = getRoute(key);

			const filtersToAdd = Object.keys(clickedData?.record || {}).reduce(
				(acc: FilterData[], key) => [
					...acc,
					{
						filterKey: key,
						filterValue: clickedData?.record?.[key] || '',
						operator: OPERATORS['='],
					},
				],
				[],
			);

			const newQuery = addFilterToQuery(query, filtersToAdd);

			console.log('filtersToAdd', filtersToAdd);
			const queryParams = {
				[QueryParams.compositeQuery]: JSON.stringify(newQuery),
				// [QueryParams.compositeQuery]: JSON.stringify(query),
			};

			if (route) {
				safeNavigate(`${route}?${createQueryParams(queryParams)}`, {
					newTab: true,
				});
			}

			onClose();
		},
		[clickedData, query, widgetId, safeNavigate, onClose],
	);

	const aggregateDrilldownConfig = useMemo(
		() =>
			getContextMenuConfig({
				configType: ConfigType.AGGREGATE,
				query,
				clickedData,
				panelType: 'table',
				onColumnClick: handleAggregateDrilldown,
			}),
		[handleAggregateDrilldown, clickedData, query],
	);
	return { aggregateDrilldownConfig };
};

export default useAggregateDrilldown;
