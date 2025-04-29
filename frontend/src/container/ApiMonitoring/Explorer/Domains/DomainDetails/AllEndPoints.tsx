import { Select } from 'antd';
import { initialQueriesMap } from 'constants/queryBuilder';
import {
	getAllEndpointsWidgetData,
	getGroupByFiltersFromGroupByValues,
} from 'container/ApiMonitoring/utils';
import GridCard from 'container/GridCardLayout/GridCard';
import QueryBuilderSearchV2 from 'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { SPAN_ATTRIBUTES, VIEWS } from './constants';

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
	const {
		data: groupByFiltersData,
		isLoading: isLoadingGroupByFilters,
	} = useGetAggregateKeys({
		dataSource: DataSource.TRACES,
		aggregateAttribute: '',
		aggregateOperator: 'noop',
		searchText: '',
		tagType: '',
	});

	const [groupByOptions, setGroupByOptions] = useState<
		{ value: string; label: string }[]
	>([]);

	const handleGroupByChange = useCallback(
		(value: IBuilderQuery['groupBy']) => {
			const groupBy = [];

			for (let index = 0; index < value.length; index++) {
				const element = (value[index] as unknown) as string;

				const key = groupByFiltersData?.payload?.attributeKeys?.find(
					(key) => key.key === element,
				);

				if (key) {
					groupBy.push(key);
				}
			}
			setGroupBy(groupBy);
		},
		[groupByFiltersData, setGroupBy],
	);

	useEffect(() => {
		if (groupByFiltersData?.payload) {
			setGroupByOptions(
				groupByFiltersData?.payload?.attributeKeys?.map((filter) => ({
					value: filter.key,
					label: filter.key,
				})) || [],
			);
		}
	}, [groupByFiltersData]);

	const currentQuery = initialQueriesMap[DataSource.TRACES];

	// Local state for filters, combining endpoint filter and search filters
	const [filters, setFilters] = useState<IBuilderQuery['filters']>(() => {
		// Initialize filters based on the initial endPointName prop
		const initialItems = [...initialFilters.items];
		return { op: 'AND', items: initialItems };
	});

	// Handler for changes from the QueryBuilderSearchV2 component
	const handleFilterChange = useCallback(
		(newFilters: IBuilderQuery['filters']): void => {
			// 1. Update local filters state immediately
			setFilters(newFilters);
		},
		[], // Dependencies for the callback
	);

	const updatedCurrentQuery = useMemo(
		() => ({
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: [
					{
						...currentQuery.builder.queryData[0],
						dataSource: DataSource.TRACES,
						filters, // Use the local filters state
					},
				],
			},
		}),
		[filters, currentQuery],
	);

	const query = updatedCurrentQuery?.builder?.queryData[0] || null;

	const allEndpointsWidgetData = useMemo(
		() => getAllEndpointsWidgetData(groupBy, domainName, filters),
		[groupBy, domainName, filters],
	);

	const onRowClick = useCallback(
		(props: any): void => {
			setSelectedEndPointName(props[SPAN_ATTRIBUTES.URL_PATH] as string);
			setSelectedView(VIEWS.ENDPOINT_STATS);
			const initialItems = [
				...filters.items,
				...getGroupByFiltersFromGroupByValues(props, groupBy).items,
			];
			setInitialFiltersEndPointStats({
				items: initialItems,
				op: 'AND',
			});
		},
		[
			filters,
			setInitialFiltersEndPointStats,
			setSelectedEndPointName,
			setSelectedView,
			groupBy,
		],
	);

	return (
		<div className="all-endpoints-container">
			<div className="all-endpoints-header">
				<div className="filter-container">
					<QueryBuilderSearchV2
						query={query}
						onChange={handleFilterChange}
						placeholder="Search for filters..."
					/>
				</div>
			</div>
			<div className="group-by-container">
				<div className="group-by-label"> Group by </div>
				<Select
					className="group-by-select"
					loading={isLoadingGroupByFilters}
					mode="multiple"
					value={groupBy}
					allowClear
					maxTagCount="responsive"
					placeholder="Search for attribute"
					options={groupByOptions}
					onChange={handleGroupByChange}
				/>{' '}
			</div>
			<div className="endpoints-table-container">
				<GridCard
					widget={allEndpointsWidgetData}
					isQueryEnabled
					onDragSelect={(): void => {}}
					customOnDragSelect={(): void => {}}
					customTimeRange={timeRange}
					customOnRowClick={onRowClick}
				/>
			</div>
		</div>
	);
}

export default AllEndPoints;
