import { useCallback, useEffect, useMemo, useState } from 'react';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import { combineInitialAndUserExpression } from 'components/QueryBuilderV2/QueryV2/QuerySearch/utils';
import { ENTITY_VERSION_V5 } from 'constants/app';
import {
	getAllEndpointsWidgetData,
	getGroupByExpressionFromRowData,
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
	initialFilterExpression,
	setInitialFilterExpressionEndPointStats,
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
	initialFilterExpression: string;
	setInitialFilterExpressionEndPointStats: (expression: string) => void;
}): JSX.Element {
	const [params, setParams] = useApiMonitoringParams();

	// --- FILTERS STATE SYNC ---
	const [filterExpression, setFilterExpression] = useState<string>(
		() => params.allEndpointsFilterExpression ?? initialFilterExpression,
	);

	// Sync params to local filters state on param change
	useEffect(() => {
		if (
			params.allEndpointsFilterExpression !== undefined &&
			params.allEndpointsFilterExpression !== filterExpression
		) {
			setFilterExpression(params.allEndpointsFilterExpression);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params.allEndpointsFilterExpression]);

	// Handler for changes from the QuerySearch component
	const handleFilterChange = useCallback(
		(expression: string): void => {
			setFilterExpression(expression);
			setParams({ allEndpointsFilterExpression: expression });
		},
		[setParams],
	);

	const {
		queryData,
		onDraftChange,
		onRun,
		onBlur: handleFilterBlur,
	} = useFilterExpression({
		expression: filterExpression,
		groupBy,
		onExpressionChange: handleFilterChange,
	});

	const allEndpointsWidgetData = useMemo(
		() => getAllEndpointsWidgetData(groupBy, domainName, filterExpression),
		[groupBy, domainName, filterExpression],
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
			const statsExpression = combineInitialAndUserExpression(
				getGroupByExpressionFromRowData(props),
				filterExpression,
			);
			setInitialFilterExpressionEndPointStats(statsExpression);
			setParams({
				selectedEndPointName: props[SPAN_ATTRIBUTES.HTTP_URL] as string,
				selectedView: VIEWS.ENDPOINT_STATS,
				endPointDetailsFilterExpression: statsExpression,
			});
		},
		[
			filterExpression,
			setInitialFilterExpressionEndPointStats,
			setSelectedEndPointName,
			setSelectedView,
			setParams,
		],
	);

	return (
		<div className="all-endpoints-container">
			<div className="all-endpoints-header">
				<div className="filter-container" onBlur={handleFilterBlur}>
					<QuerySearch
						queryData={queryData}
						onChange={onDraftChange}
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
