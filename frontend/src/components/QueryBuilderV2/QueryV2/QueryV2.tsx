/* eslint-disable sonarjs/cognitive-complexity */
import { Dropdown } from 'antd';
import cx from 'classnames';
import { ENTITY_VERSION_V4, ENTITY_VERSION_V5 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import QBEntityOptions from 'container/QueryBuilder/components/QBEntityOptions/QBEntityOptions';
import { QueryProps } from 'container/QueryBuilder/components/Query/Query.interfaces';
import SpanScopeSelector from 'container/QueryBuilder/filters/QueryBuilderSearchV2/SpanScopeSelector';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { Copy, Ellipsis, Trash } from 'lucide-react';
import {
	ForwardedRef,
	forwardRef,
	useCallback,
	useMemo,
	useState,
} from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { HandleChangeQueryDataV5 } from 'types/common/operations.types';
import { DataSource } from 'types/common/queryBuilder';

import MetricsAggregateSection from './MerticsAggregateSection/MetricsAggregateSection';
import { MetricsSelect } from './MetricsSelect/MetricsSelect';
import QueryAddOns from './QueryAddOns/QueryAddOns';
import QueryAggregation from './QueryAggregation/QueryAggregation';
import QuerySearch from './QuerySearch/QuerySearch';

export const QueryV2 = forwardRef(function QueryV2(
	{
		index,
		queryVariant,
		query,
		filterConfigs,
		isListViewPanel = false,
		showTraceOperator = false,
		hasTraceOperator = false,
		version,
		showOnlyWhereClause = false,
		signalSource = '',
		isMultiQueryAllowed = false,
		onSignalSourceChange,
		signalSourceChangeEnabled = false,
		queriesCount = 1,
	}: QueryProps & {
		onSignalSourceChange: (value: string) => void;
		signalSourceChangeEnabled: boolean;
		queriesCount: number;
	},
	ref: ForwardedRef<HTMLDivElement>,
): JSX.Element {
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

	const showInlineQuerySearch = useMemo(() => {
		if (!showTraceOperator) {
			return false;
		}
		return (
			dataSource === DataSource.TRACES && (hasTraceOperator || isListViewPanel)
		);
	}, [hasTraceOperator, isListViewPanel, showTraceOperator, dataSource]);

	const handleChangeAggregateEvery = useCallback(
		(value: IBuilderQuery['stepInterval']) => {
			handleChangeQueryData('stepInterval', value);
		},
		[handleChangeQueryData],
	);

	const handleSearchChange = useCallback(
		(value: string) => {
			(handleChangeQueryData as HandleChangeQueryDataV5)('filter', {
				expression: value,
			});
		},
		[handleChangeQueryData],
	);

	const handleChangeAggregation = useCallback(
		(value: string) => {
			(handleChangeQueryData as HandleChangeQueryDataV5)('aggregations', [
				{
					expression: value,
				},
			]);
		},
		[handleChangeQueryData],
	);

	return (
		<div
			className={cx('query-v2', { 'where-clause-view': showOnlyWhereClause })}
			ref={ref}
		>
			<div className="qb-content-section">
				{(!showOnlyWhereClause || showTraceOperator) && (
					<div className="qb-header-container">
						<div className="query-actions-container">
							<div className="query-actions-left-container">
								<QBEntityOptions
									hasTraceOperator={hasTraceOperator}
									isMetricsDataSource={dataSource === DataSource.METRICS}
									showFunctions={
										(version && version === ENTITY_VERSION_V4) ||
										query.dataSource === DataSource.LOGS ||
										query.dataSource === DataSource.METRICS ||
										showFunctions ||
										false
									}
									isCollapsed={isCollapsed}
									showTraceOperator={showTraceOperator}
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

							{!isCollapsed && showInlineQuerySearch && (
								<div className="qb-search-filter-container">
									<div className="query-search-container">
										<QuerySearch
											key={`query-search-${query.queryName}-${query.dataSource}`}
											onChange={handleSearchChange}
											queryData={query}
											dataSource={dataSource}
											signalSource={signalSource}
										/>
									</div>

									{showSpanScopeSelector && (
										<div className="traces-search-filter-container">
											<div className="traces-search-filter-in">in</div>
											<SpanScopeSelector query={query} />
										</div>
									)}
								</div>
							)}

							{isMultiQueryAllowed && (
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
											...(queriesCount && queriesCount > 1
												? [
														{
															label: 'Delete',
															key: 'delete-query',
															icon: <Trash size={14} />,
															onClick: handleDeleteQuery,
														},
												  ]
												: []),
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

				{!isCollapsed && (
					<div className="qb-elements-container">
						<div className="qb-search-container">
							{dataSource === DataSource.METRICS && (
								<div className="metrics-container">
									<MetricsSelect
										query={query}
										index={index}
										version={ENTITY_VERSION_V5}
										signalSource={signalSource as 'meter' | ''}
										onSignalSourceChange={onSignalSourceChange}
										signalSourceChangeEnabled={signalSourceChangeEnabled}
									/>
								</div>
							)}

							{!showInlineQuerySearch && (
								<div className="qb-search-filter-container">
									<div className="query-search-container">
										<QuerySearch
											key={`query-search-${query.queryName}-${query.dataSource}`}
											onChange={handleSearchChange}
											queryData={query}
											dataSource={dataSource}
											signalSource={signalSource}
										/>
									</div>

									{showSpanScopeSelector && (
										<div className="traces-search-filter-container">
											<div className="traces-search-filter-in">in</div>
											<SpanScopeSelector query={query} />
										</div>
									)}
								</div>
							)}
						</div>

						{!showOnlyWhereClause &&
							!isListViewPanel &&
							!(hasTraceOperator && dataSource === DataSource.TRACES) &&
							dataSource !== DataSource.METRICS && (
								<QueryAggregation
									dataSource={dataSource}
									key={`query-search-${query.queryName}-${query.dataSource}`}
									panelType={panelType || undefined}
									onAggregationIntervalChange={handleChangeAggregateEvery}
									onChange={handleChangeAggregation}
									queryData={query}
								/>
							)}

						{!showOnlyWhereClause && dataSource === DataSource.METRICS && (
							<MetricsAggregateSection
								panelType={panelType}
								query={query}
								index={index}
								key={`metrics-aggregate-section-${query.queryName}-${query.dataSource}-${signalSource}`}
								version="v4"
								signalSource={signalSource as 'meter' | ''}
							/>
						)}

						{!showOnlyWhereClause &&
							!(hasTraceOperator && query.dataSource === DataSource.TRACES) && (
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
				)}
			</div>
		</div>
	);
});

QueryV2.displayName = 'QueryV2';
