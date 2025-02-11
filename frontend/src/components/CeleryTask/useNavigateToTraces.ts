import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Query, TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, MetricAggregateOperator } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

export function useNavigateToTraces(): (
	filters: TagFilterItem[],
	startTime?: number,
	endTime?: number,
	sameTab?: boolean,
) => void {
	const { currentQuery } = useQueryBuilder();
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const prepareQuery = useCallback(
		(selectedFilters: TagFilterItem[]): Query => ({
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: currentQuery.builder.queryData.map((item) => ({
					...item,
					dataSource: DataSource.TRACES,
					aggregateOperator: MetricAggregateOperator.NOOP,
					filters: {
						...item.filters,
						items: selectedFilters,
					},
				})),
			},
		}),
		[currentQuery],
	);

	return useCallback(
		(
			filters: TagFilterItem[],
			startTime?: number,
			endTime?: number,
			sameTab?: boolean,
		): void => {
			const urlParams = new URLSearchParams();
			if (startTime && endTime) {
				urlParams.set(QueryParams.startTime, startTime.toString());
				urlParams.set(QueryParams.endTime, endTime.toString());
			} else {
				urlParams.set(QueryParams.startTime, (minTime / 1000000).toString());
				urlParams.set(QueryParams.endTime, (maxTime / 1000000).toString());
			}

			const JSONCompositeQuery = encodeURIComponent(
				JSON.stringify(prepareQuery(filters)),
			);

			const newTraceExplorerPath = `${
				ROUTES.TRACES_EXPLORER
			}?${urlParams.toString()}&${
				QueryParams.compositeQuery
			}=${JSONCompositeQuery}`;

			window.open(newTraceExplorerPath, sameTab ? '_self' : '_blank');
		},
		[minTime, maxTime, prepareQuery],
	);
}
