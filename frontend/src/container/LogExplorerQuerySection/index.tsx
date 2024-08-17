import './LogsExplorerQuerySection.styles.scss';

import {
	initialQueriesMap,
	OPERATORS,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import ExplorerOrderBy from 'container/ExplorerOrderBy';
import { QueryBuilder } from 'container/QueryBuilder';
import { OrderByFilterProps } from 'container/QueryBuilder/filters/OrderByFilter/OrderByFilter.interfaces';
import QueryBuilderSearchV2 from 'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import {
	prepareQueryWithDefaultTimestamp,
	SELECTED_VIEWS,
} from 'pages/LogsExplorer/utils';
import { memo, useCallback, useMemo } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

function LogExplorerQuerySection({
	selectedView,
}: {
	selectedView: SELECTED_VIEWS;
}): JSX.Element {
	const { currentQuery, updateAllQueriesOperators } = useQueryBuilder();

	const query = currentQuery?.builder?.queryData[0] || null;

	const panelTypes = useGetPanelTypesQueryParam(PANEL_TYPES.LIST);
	const defaultValue = useMemo(() => {
		const updatedQuery = updateAllQueriesOperators(
			initialQueriesMap.logs,
			PANEL_TYPES.LIST,
			DataSource.LOGS,
		);
		return prepareQueryWithDefaultTimestamp(updatedQuery);
	}, [updateAllQueriesOperators]);

	useShareBuilderUrl(defaultValue);

	const filterConfigs: QueryBuilderProps['filterConfigs'] = useMemo(() => {
		const isTable = panelTypes === PANEL_TYPES.TABLE;
		const isList = panelTypes === PANEL_TYPES.LIST;
		const config: QueryBuilderProps['filterConfigs'] = {
			stepInterval: { isHidden: isTable, isDisabled: false },
			having: { isHidden: isList, isDisabled: true },
			filters: {
				customKey: 'body',
				customOp: OPERATORS.CONTAINS,
			},
		};

		return config;
	}, [panelTypes]);

	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query,
		filterConfigs,
		entityVersion: '',
	});

	const renderOrderBy = useCallback(
		({ query, onChange }: OrderByFilterProps): JSX.Element => (
			<ExplorerOrderBy query={query} onChange={onChange} />
		),
		[],
	);

	const queryComponents = useMemo(
		(): QueryBuilderProps['queryComponents'] => ({
			...(panelTypes === PANEL_TYPES.LIST ? { renderOrderBy } : {}),
		}),
		[panelTypes, renderOrderBy],
	);

	const handleChangeTagFilters = useCallback(
		(value: IBuilderQuery['filters']) => {
			handleChangeQueryData('filters', value);
		},
		[handleChangeQueryData],
	);

	return (
		<>
			{selectedView === SELECTED_VIEWS.SEARCH && (
				<div className="qb-search-view-container">
					<QueryBuilderSearchV2
						query={query}
						onChange={handleChangeTagFilters}
						whereClauseConfig={filterConfigs?.filters}
					/>
				</div>
			)}

			{selectedView === SELECTED_VIEWS.QUERY_BUILDER && (
				<QueryBuilder
					panelType={panelTypes}
					config={{ initialDataSource: DataSource.LOGS, queryVariant: 'static' }}
					filterConfigs={filterConfigs}
					queryComponents={queryComponents}
					version="v3" // setting this to v3 as we this is rendered in logs explorer
				/>
			)}
		</>
	);
}

export default memo(LogExplorerQuerySection);
