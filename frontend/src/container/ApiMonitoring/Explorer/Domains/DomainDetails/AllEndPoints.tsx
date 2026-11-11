import { useCallback, useEffect, useMemo } from 'react';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import { combineInitialAndUserExpression } from 'components/QueryBuilderV2/QueryV2/QuerySearch/utils';
import { ENTITY_VERSION_V5 } from 'constants/app';
import {
	getAllEndpointsWidgetData,
	getDomainScopeClauses,
	getGroupByExpressionFromRowData,
} from 'container/ApiMonitoring/utils';
import GridCard from 'container/WidgetCard/Card';
import { GroupByFilter } from 'container/QueryBuilder/filters/GroupByFilter/GroupByFilter';
import { chooseAutocompleteFromCustomValue } from 'lib/newQueryBuilder/chooseAutocompleteFromCustomValue';
import { isEqual } from 'lodash-es';
import { parseAsString, useQueryState } from 'nuqs';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { ENDPOINT_STATS_EXPRESSION_KEY } from '../../../filterParamKeys';
import { useApiMonitoringParams } from '../../../queryParams';
import { SPAN_ATTRIBUTES, VIEWS } from './constants';
import { useFilterExpression } from './hooks/useFilterExpression';
import { useIsFetchingWidgets } from './hooks/useIsFetchingWidgets';

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
	const [params, setParams] = useApiMonitoringParams();
	const [, setEndPointStatsExpression] = useQueryState(
		ENDPOINT_STATS_EXPRESSION_KEY,
		parseAsString,
	);

	// --- FILTERS STATE SYNC ---
	const {
		expression: filterExpression,
		initialExpression: scopeExpression,
		queryData,
		onDraftChange,
		onRun,
		onBlur: handleFilterBlur,
	} = useFilterExpression({
		groupBy,
	});

	const scopeClauses = useMemo(
		() => getDomainScopeClauses(domainName),
		[domainName],
	);

	const allEndpointsWidgetData = useMemo(
		() => getAllEndpointsWidgetData(groupBy, domainName, filterExpression),
		[groupBy, domainName, filterExpression],
	);

	const isFetchingTable = useIsFetchingWidgets([allEndpointsWidgetData]);

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
			void setEndPointStatsExpression(statsExpression || null);
			setParams({
				selectedEndPointName: props[SPAN_ATTRIBUTES.HTTP_URL] as string,
				selectedView: VIEWS.ENDPOINT_STATS,
			});
		},
		[
			filterExpression,
			setEndPointStatsExpression,
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
						showRunButton
						isLoadingQueries={isFetchingTable}
						initialExpression={scopeExpression}
						scopeClauses={scopeClauses}
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
