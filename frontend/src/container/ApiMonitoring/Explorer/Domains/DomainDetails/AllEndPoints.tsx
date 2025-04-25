import { Select } from 'antd';
import { getAllEndpointsWidgetData } from 'container/ApiMonitoring/utils';
import GridCard from 'container/GridCardLayout/GridCard';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { VIEWS } from './constants';

function AllEndPoints({
	domainName,
	setSelectedEndPointName,
	setSelectedView,
	groupBy,
	setGroupBy,
	timeRange,
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

	const allEndpointsWidgetData = useMemo(
		() => getAllEndpointsWidgetData(groupBy, domainName),
		[groupBy, domainName],
	);

	return (
		<div className="all-endpoints-container">
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
					customOnRowClick={(props): void => {
						setSelectedEndPointName(props['http.url'] as string);
						setSelectedView(VIEWS.ENDPOINT_STATS);
					}}
				/>
			</div>
		</div>
	);
}

export default AllEndPoints;
