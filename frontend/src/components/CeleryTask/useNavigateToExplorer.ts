import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import useUpdatedQuery from 'container/GridCardLayout/useResolveQuery';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useNotifications } from 'hooks/useNotifications';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Query, TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, MetricAggregateOperator } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

export interface NavigateToExplorerProps {
	filters: TagFilterItem[];
	dataSource: DataSource;
	startTime?: number;
	endTime?: number;
	sameTab?: boolean;
	shouldResolveQuery?: boolean;
}

export function useNavigateToExplorer(): (
	props: NavigateToExplorerProps,
) => void {
	const { currentQuery } = useQueryBuilder();
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const prepareQuery = useCallback(
		(selectedFilters: TagFilterItem[], dataSource: DataSource): Query => ({
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: currentQuery.builder.queryData
					.map((item) => ({
						...item,
						dataSource,
						aggregateOperator: MetricAggregateOperator.NOOP,
						filters: {
							...item.filters,
							items: selectedFilters,
						},
						groupBy: [],
						disabled: false,
					}))
					.slice(0, 1),
				queryFormulas: [],
			},
		}),
		[currentQuery],
	);

	const { getUpdatedQuery } = useUpdatedQuery();
	const { selectedDashboard } = useDashboard();
	const { notifications } = useNotifications();

	return useCallback(
		async (props: NavigateToExplorerProps): Promise<void> => {
			const {
				filters,
				dataSource,
				startTime,
				endTime,
				sameTab,
				shouldResolveQuery,
			} = props;
			const urlParams = new URLSearchParams();
			if (startTime && endTime) {
				urlParams.set(QueryParams.startTime, startTime.toString());
				urlParams.set(QueryParams.endTime, endTime.toString());
			} else {
				urlParams.set(QueryParams.startTime, (minTime / 1000000).toString());
				urlParams.set(QueryParams.endTime, (maxTime / 1000000).toString());
			}

			let preparedQuery = prepareQuery(filters, dataSource);

			if (shouldResolveQuery) {
				await getUpdatedQuery({
					widgetConfig: {
						query: preparedQuery,
						panelTypes: PANEL_TYPES.TIME_SERIES,
						timePreferance: 'GLOBAL_TIME',
					},
					selectedDashboard,
				})
					.then((query) => {
						preparedQuery = query;
					})
					.catch(() => {
						notifications.error({
							message: 'Unable to resolve variables',
						});
					});
			}

			const JSONCompositeQuery = encodeURIComponent(JSON.stringify(preparedQuery));

			const basePath =
				dataSource === DataSource.TRACES
					? ROUTES.TRACES_EXPLORER
					: ROUTES.LOGS_EXPLORER;
			const newExplorerPath = `${basePath}?${urlParams.toString()}&${
				QueryParams.compositeQuery
			}=${JSONCompositeQuery}`;

			window.open(newExplorerPath, sameTab ? '_self' : '_blank');
		},
		[
			prepareQuery,
			minTime,
			maxTime,
			getUpdatedQuery,
			selectedDashboard,
			notifications,
		],
	);
}
