import { Dropdown } from 'antd';
import cx from 'classnames';
import { ENTITY_VERSION_V4 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import QBEntityOptions from 'container/QueryBuilder/components/QBEntityOptions/QBEntityOptions';
import { QueryProps } from 'container/QueryBuilder/components/Query/Query.interfaces';
import SpanScopeSelector from 'container/QueryBuilder/filters/QueryBuilderSearchV2/SpanScopeSelector';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { Copy, Ellipsis, Trash } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import MetricsAggregateSection from './MerticsAggregateSection/MetricsAggregateSection';
import { MetricsSelect } from './MetricsSelect/MetricsSelect';
import QueryAddOns from './QueryAddOns/QueryAddOns';
import QueryAggregation from './QueryAggregation/QueryAggregation';
import QuerySearch from './QuerySearch/QuerySearch';

export const QueryV2 = memo(function QueryV2({
	index,
	queryVariant,
	query,
	filterConfigs,
	isListViewPanel = false,
	version,
	showOnlyWhereClause = false,
}: QueryProps): JSX.Element {
	const { cloneQuery, panelType } = useQueryBuilder();

	const showFunctions = query?.functions?.length > 0;
	const { dataSource } = query;

	const [isCollapsed, setIsCollapsed] = useState(false);

	const {
		handleChangeQueryData,
		handleDeleteQuery,
		handleQueryFunctionsUpdates,
		handleChangeDataSource,
	} = useQueryOperations({
		index,
		query,
		filterConfigs,
		isListViewPanel,
		entityVersion: version,
	});

	const handleToggleDisableQuery = useCallback(() => {
		handleChangeQueryData('disabled', !query.disabled);
	}, [handleChangeQueryData, query]);

	const handleToggleCollapsQuery = (): void => {
		setIsCollapsed(!isCollapsed);
	};

	const handleCloneEntity = (): void => {
		cloneQuery('query', query);
	};

	const showReduceTo = useMemo(
		() =>
			dataSource === DataSource.METRICS &&
			(panelType === PANEL_TYPES.TABLE ||
				panelType === PANEL_TYPES.PIE ||
				panelType === PANEL_TYPES.VALUE),
		[dataSource, panelType],
	);

	const showSpanScopeSelector = useMemo(() => dataSource === DataSource.TRACES, [
		dataSource,
	]);

	return (
		<div className={cx('query-v2', { 'where-clause-view': showOnlyWhereClause })}>
			<div className="qb-content-section">
				{!showOnlyWhereClause && (
					<div className="qb-header-container">
						<div className="query-actions-container">
							<div className="query-actions-left-container">
								<QBEntityOptions
									isMetricsDataSource={dataSource === DataSource.METRICS}
									showFunctions={
										(version && version === ENTITY_VERSION_V4) ||
										query.dataSource === DataSource.LOGS ||
										showFunctions ||
										false
									}
									isCollapsed={isCollapsed}
									entityType="query"
									entityData={query}
									onToggleVisibility={handleToggleDisableQuery}
									onDelete={handleDeleteQuery}
									onCloneQuery={cloneQuery}
									onCollapseEntity={handleToggleCollapsQuery}
									query={query}
									onQueryFunctionsUpdates={handleQueryFunctionsUpdates}
									showDeleteButton={false}
									showCloneOption={false}
									isListViewPanel={isListViewPanel}
									index={index}
									queryVariant={queryVariant}
									onChangeDataSource={handleChangeDataSource}
								/>
							</div>

							{!isListViewPanel && (
								<Dropdown
									className="query-actions-dropdown"
									menu={{
										items: [
											{
												label: 'Clone',
												key: 'clone-query',
												icon: <Copy size={14} />,
												onClick: handleCloneEntity,
											},
											{
												label: 'Delete',
												key: 'delete-query',
												icon: <Trash size={14} />,
												onClick: handleDeleteQuery,
											},
										],
									}}
									placement="bottomRight"
								>
									<Ellipsis size={16} />
								</Dropdown>
							)}
						</div>
					</div>
				)}

				<div className="qb-elements-container">
					<div className="qb-search-container">
						{dataSource === DataSource.METRICS && (
							<div className="metrics-select-container">
								<MetricsSelect query={query} index={0} version="v4" />
							</div>
						)}

						<div className="qb-search-filter-container">
							<QuerySearch />

							{showSpanScopeSelector && (
								<>
									<div className="traces-search-filter-in">in</div>
									<SpanScopeSelector queryName={query.queryName} />
								</>
							)}
						</div>
					</div>

					{!showOnlyWhereClause && !isListViewPanel && (
						<QueryAggregation
							dataSource={dataSource}
							panelType={panelType || undefined}
						/>
					)}

					{!showOnlyWhereClause && dataSource === DataSource.METRICS && (
						<MetricsAggregateSection
							panelType={panelType}
							query={query}
							index={0}
							version="v4"
						/>
					)}

					{!showOnlyWhereClause && (
						<QueryAddOns
							index={index}
							query={query}
							version="v3"
							isListViewPanel={isListViewPanel}
							showReduceTo={showReduceTo}
							panelType={panelType}
						/>
					)}
				</div>
			</div>
		</div>
	);
});
