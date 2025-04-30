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
	const [groupBySearchValue, setGroupBySearchValue] = useState<string>('');
	const [allAvailableGroupByOptions, setAllAvailableGroupByOptions] = useState<{
		[key: string]: any;
	}>({});

	const {
		data: groupByFiltersData,
		isLoading: isLoadingGroupByFilters,
	} = useGetAggregateKeys({
		dataSource: DataSource.TRACES,
		aggregateAttribute: '',
		aggregateOperator: 'noop',
		searchText: groupBySearchValue,
		tagType: '',
	});

	const [groupByOptions, setGroupByOptions] = useState<
		{ value: string; label: string }[]
	>([]);

	const handleGroupByChange = useCallback(
		(value: IBuilderQuery['groupBy']) => {
			const newGroupBy = [];

			for (let index = 0; index < value.length; index++) {
				const element = (value[index] as unknown) as string;

				// Check if the key exists in our cached options first
				if (allAvailableGroupByOptions[element]) {
					newGroupBy.push(allAvailableGroupByOptions[element]);
				} else {
					// If not found in cache, check the current filtered results
					const key = groupByFiltersData?.payload?.attributeKeys?.find(
						(key) => key.key === element,
					);

					if (key) {
						newGroupBy.push(key);
					}
				}
			}

			setGroupBy(newGroupBy);
			setGroupBySearchValue('');
		},
		[groupByFiltersData, setGroupBy, allAvailableGroupByOptions],
	);

	useEffect(() => {
		if (groupByFiltersData?.payload) {
			// Update dropdown options
			setGroupByOptions(
				groupByFiltersData?.payload?.attributeKeys?.map((filter) => ({
					value: filter.key,
					label: filter.key,
				})) || [],
			);

			// Cache all available options to preserve selected values using functional update
			// to avoid dependency on allAvailableGroupByOptions
			setAllAvailableGroupByOptions((prevOptions) => {
				const newOptions = { ...prevOptions };
				groupByFiltersData?.payload?.attributeKeys?.forEach((filter) => {
					newOptions[filter.key] = filter;
				});
				return newOptions;
			});
		}
	}, [groupByFiltersData]); // Only depends on groupByFiltersData now

	// Cache existing selected options on component mount
	useEffect(() => {
		if (groupBy && groupBy.length > 0) {
			setAllAvailableGroupByOptions((prevOptions) => {
				const newOptions = { ...prevOptions };
				groupBy.forEach((option) => {
					newOptions[option.key] = option;
				});
				return newOptions;
			});
		}
	}, [groupBy]); // Removed allAvailableGroupByOptions from dependencies

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
					onSearch={(value: string): void => setGroupBySearchValue(value)}
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
