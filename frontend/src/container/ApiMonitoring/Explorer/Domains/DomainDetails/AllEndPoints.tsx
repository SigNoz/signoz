import { useCallback, useEffect, useMemo, useState } from 'react';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import { ENTITY_VERSION_V5 } from 'constants/app';
import {
	getAllEndpointsWidgetData,
	getGroupByFiltersFromGroupByValues,
} from 'container/ApiMonitoring/utils';
import GridCard from 'container/WidgetCard/Card';
import { GroupByFilter } from 'container/QueryBuilder/filters/GroupByFilter/GroupByFilter';
import { chooseAutocompleteFromCustomValue } from 'lib/newQueryBuilder/chooseAutocompleteFromCustomValue';
import { isEqual } from 'lodash-es';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { useApiMonitoringParams } from '../../../queryParams';
import { SPAN_ATTRIBUTES, VIEWS } from './constants';
import { useFilterExpression } from './hooks/useFilterExpression';

function AllEndPoints({
	domainName,
	setSelectedEndPointName,
	setSelectedView,
	groupBy,
	setGroupBy,
	timeRange,
	initialFilters,
	setInitialFiltersEndPointStats,
}: {
	domainName: string;
	setSelectedEndPointName: (name: string) => void;
	setSelectedView: (tab: VIEWS) => void;
	groupBy: IBuilderQuery['groupBy'];
	setGroupBy: (groupBy: IBuilderQuery['groupBy']) => void;
	timeRange: {
		startTime: number;
		endTime: number;
	};
	initialFilters: IBuilderQuery['filters'];
	setInitialFiltersEndPointStats: (filters: IBuilderQuery['filters']) => void;
}): JSX.Element {
	const [params, setParams] = useApiMonitoringParams();

	// --- FILTERS STATE SYNC ---
	const [filters, setFilters] = useState<IBuilderQuery['filters']>(() => {
		if (params.allEndpointsLocalFilters) {
			return params.allEndpointsLocalFilters;
		}
		// Initialize filters based on the initial endPointName prop
		const initialItems = [...(initialFilters?.items || [])];
		return { op: 'AND', items: initialItems };
	});

	// Sync params to local filters state on param change
	useEffect(() => {
		if (
			params.allEndpointsLocalFilters &&
			!isEqual(params.allEndpointsLocalFilters, filters)
		) {
			setFilters(params.allEndpointsLocalFilters);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params.allEndpointsLocalFilters]);

	// Handler for changes from the QuerySearch component
	const handleFilterChange = useCallback(
		(newFilters: IBuilderQuery['filters']): void => {
			setFilters(newFilters);
			setParams({ allEndpointsLocalFilters: newFilters });
		},
		[setParams],
	);

	const {
		queryData,
		onExpressionChange,
		onRun,
		onBlur: handleFilterBlur,
	} = useFilterExpression({
		filters,
		groupBy,
		onFiltersChange: handleFilterChange,
	});

	const allEndpointsWidgetData = useMemo(
		() => getAllEndpointsWidgetData(groupBy, domainName, filters),
		[groupBy, domainName, filters],
	);

	// --- GROUP BY STATE SYNC (existing) ---
	const handleGroupByChange = useCallback(
		(value: IBuilderQuery['groupBy']) => {
			setGroupBy(value);
			// Update params
			setParams({ groupBy: value.map((g) => g.key) });
		},
		[setGroupBy, setParams],
	);

	// Sync params to local groupBy state on param change
	useEffect(() => {
		if (
			params.groupBy &&
			Array.isArray(params.groupBy) &&
			!isEqual(
				params.groupBy,
				groupBy.map((g) => g.key),
			)
		) {
			setGroupBy(
				params.groupBy.map((key) => chooseAutocompleteFromCustomValue([], key)),
			);
		}
	}, [params.groupBy, groupBy, setGroupBy]);

	const onRowClick = useCallback(
		(props: any): void => {
			setSelectedEndPointName(props[SPAN_ATTRIBUTES.HTTP_URL] as string);
			setSelectedView(VIEWS.ENDPOINT_STATS);
			const initialItems = [
				...(filters?.items || []),
				...(getGroupByFiltersFromGroupByValues(props, groupBy)?.items || []),
			];
			setInitialFiltersEndPointStats({
				items: initialItems,
				op: 'AND',
			});
			setParams({
				selectedEndPointName: props[SPAN_ATTRIBUTES.HTTP_URL] as string,
				selectedView: VIEWS.ENDPOINT_STATS,
				endPointDetailsLocalFilters: {
					items: initialItems,
					op: 'AND',
				},
			});
		},
		[
			filters,
			setInitialFiltersEndPointStats,
			setSelectedEndPointName,
			setSelectedView,
			groupBy,
			setParams,
		],
	);

	return (
		<div className="all-endpoints-container">
			<div className="all-endpoints-header">
				<div className="filter-container" onBlur={handleFilterBlur}>
					<QuerySearch
						queryData={queryData}
						onChange={onExpressionChange}
						onRun={onRun}
						dataSource={DataSource.TRACES}
						placeholder="Search for filters..."
					/>
				</div>
			</div>
			<div className="group-by-container">
				<div className="group-by-label"> Group by </div>
				<GroupByFilter
					query={queryData}
					onChange={handleGroupByChange}
					disabled={false}
					placeholder="Search for attribute"
				/>
			</div>
			<div className="endpoints-table-container">
				<GridCard
					widget={allEndpointsWidgetData}
					isQueryEnabled
					onDragSelect={(): void => {}}
					customOnDragSelect={(): void => {}}
					customTimeRange={timeRange}
					customOnRowClick={onRowClick}
					version={ENTITY_VERSION_V5}
				/>
			</div>
		</div>
	);
}

export default AllEndPoints;
