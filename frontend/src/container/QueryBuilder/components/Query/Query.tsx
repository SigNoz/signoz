/* eslint-disable sonarjs/cognitive-complexity */
import './Query.styles.scss';

import { Col, Input, Row, Tooltip, Typography } from 'antd';
import { ENTITY_VERSION_V4 } from 'constants/app';
// ** Constants
import { ATTRIBUTE_TYPES, PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
// ** Components
import {
	AdditionalFiltersToggler,
	DataSourceDropdown,
	FilterLabel,
} from 'container/QueryBuilder/components';
import {
	AggregatorFilter,
	GroupByFilter,
	HavingFilter,
	OperatorsSelect,
	OrderByFilter,
	ReduceToFilter,
} from 'container/QueryBuilder/filters';
import AggregateEveryFilter from 'container/QueryBuilder/filters/AggregateEveryFilter';
import LimitFilter from 'container/QueryBuilder/filters/LimitFilter/LimitFilter';
import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import QueryBuilderSearchV2 from 'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
// ** Hooks
import {
	ChangeEvent,
	memo,
	ReactNode,
	useCallback,
	useMemo,
	useState,
} from 'react';
import { useLocation } from 'react-use';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { transformToUpperCase } from 'utils/transformToUpperCase';

import QBEntityOptions from '../QBEntityOptions/QBEntityOptions';
import SpaceAggregationOptions from '../SpaceAggregationOptions/SpaceAggregationOptions';
// ** Types
import { QueryProps } from './Query.interfaces';

// eslint-disable-next-line sonarjs/cognitive-complexity
export const Query = memo(function Query({
	index,
	queryVariant,
	query,
	filterConfigs,
	queryComponents,
	isListViewPanel = false,
	showFunctions = false,
	version,
}: QueryProps): JSX.Element {
	const { panelType, currentQuery, cloneQuery } = useQueryBuilder();
	const { pathname } = useLocation();

	const [isCollapse, setIsCollapsed] = useState(false);

	const {
		operators,
		spaceAggregationOptions,
		isMetricsDataSource,
		isTracePanelType,
		listOfAdditionalFilters,
		handleChangeAggregatorAttribute,
		handleChangeQueryData,
		handleChangeDataSource,
		handleChangeOperator,
		handleSpaceAggregationChange,
		handleDeleteQuery,
		handleQueryFunctionsUpdates,
	} = useQueryOperations({
		index,
		query,
		filterConfigs,
		isListViewPanel,
		entityVersion: version,
	});

	const handleChangeAggregateEvery = useCallback(
		(value: IBuilderQuery['stepInterval']) => {
			handleChangeQueryData('stepInterval', value);
		},
		[handleChangeQueryData],
	);

	const handleChangeLimit = useCallback(
		(value: IBuilderQuery['limit']) => {
			handleChangeQueryData('limit', value);
		},
		[handleChangeQueryData],
	);

	const handleChangeHavingFilter = useCallback(
		(value: IBuilderQuery['having']) => {
			handleChangeQueryData('having', value);
		},
		[handleChangeQueryData],
	);

	const handleChangeOrderByKeys = useCallback(
		(value: IBuilderQuery['orderBy']) => {
			handleChangeQueryData('orderBy', value);
		},
		[handleChangeQueryData],
	);

	const handleToggleDisableQuery = useCallback(() => {
		handleChangeQueryData('disabled', !query.disabled);
	}, [handleChangeQueryData, query]);

	const handleChangeTagFilters = useCallback(
		(value: IBuilderQuery['filters']) => {
			handleChangeQueryData('filters', value);
		},
		[handleChangeQueryData],
	);

	const handleChangeReduceTo = useCallback(
		(value: IBuilderQuery['reduceTo']) => {
			handleChangeQueryData('reduceTo', value);
		},
		[handleChangeQueryData],
	);

	const handleChangeGroupByKeys = useCallback(
		(value: IBuilderQuery['groupBy']) => {
			handleChangeQueryData('groupBy', value);
		},
		[handleChangeQueryData],
	);

	const handleChangeQueryLegend = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			handleChangeQueryData('legend', event.target.value);
		},
		[handleChangeQueryData],
	);

	const handleToggleCollapsQuery = (): void => {
		setIsCollapsed(!isCollapse);
	};

	const renderOrderByFilter = useCallback((): ReactNode => {
		if (queryComponents?.renderOrderBy) {
			return queryComponents.renderOrderBy({
				query,
				onChange: handleChangeOrderByKeys,
			});
		}

		return (
			<OrderByFilter
				entityVersion={version}
				query={query}
				onChange={handleChangeOrderByKeys}
				isListViewPanel={isListViewPanel}
			/>
		);
	}, [
		queryComponents,
		query,
		version,
		handleChangeOrderByKeys,
		isListViewPanel,
	]);

	const renderAggregateEveryFilter = useCallback(
		(): JSX.Element | null =>
			!filterConfigs?.stepInterval?.isHidden ? (
				<Row gutter={[11, 5]}>
					<Col flex="5.93rem">
						<FilterLabel label="Aggregate Every" />
					</Col>
					<Col flex="1 1 6rem">
						<AggregateEveryFilter
							query={query}
							disabled={filterConfigs?.stepInterval?.isDisabled || false}
							onChange={handleChangeAggregateEvery}
						/>
					</Col>
				</Row>
			) : null,
		[
			filterConfigs?.stepInterval?.isHidden,
			filterConfigs?.stepInterval?.isDisabled,
			query,
			handleChangeAggregateEvery,
		],
	);

	const isExplorerPage = useMemo(
		() =>
			pathname === ROUTES.LOGS_EXPLORER || pathname === ROUTES.TRACES_EXPLORER,
		[pathname],
	);

	const renderAdditionalFilters = useCallback((): ReactNode => {
		switch (panelType) {
			case PANEL_TYPES.TIME_SERIES: {
				return (
					<>
						<Col span={11}>
							<Row gutter={[11, 5]}>
								<Col flex="5.93rem">
									<FilterLabel label="Limit" />
								</Col>
								<Col flex="1 1 12.5rem">
									<LimitFilter query={query} onChange={handleChangeLimit} />
								</Col>
							</Row>
						</Col>
						<Col span={24}>
							<Row gutter={[11, 5]}>
								<Col flex="5.93rem">
									<FilterLabel label="HAVING" />
								</Col>
								<Col flex="1 1 12.5rem">
									<HavingFilter
										entityVersion={version}
										onChange={handleChangeHavingFilter}
										query={query}
									/>
								</Col>
							</Row>
						</Col>
						<Col span={11}>
							<Row gutter={[11, 5]}>
								<Col flex="5.93rem">
									<FilterLabel label="Order by" />
								</Col>
								<Col flex="1 1 12.5rem">{renderOrderByFilter()}</Col>
							</Row>
						</Col>

						<Col span={11}>{renderAggregateEveryFilter()}</Col>
					</>
				);
			}

			case PANEL_TYPES.VALUE: {
				return (
					<>
						<Col span={11}>
							<Row gutter={[11, 5]}>
								<Col flex="5.93rem">
									<FilterLabel label="HAVING" />
								</Col>
								<Col flex="1 1 12.5rem">
									<HavingFilter
										onChange={handleChangeHavingFilter}
										entityVersion={version}
										query={query}
									/>
								</Col>
							</Row>
						</Col>
						<Col span={11}>{renderAggregateEveryFilter()}</Col>
					</>
				);
			}

			default: {
				return (
					<>
						{!filterConfigs?.limit?.isHidden && (
							<Col span={11}>
								<Row gutter={[11, 5]}>
									<Col flex="5.93rem">
										<FilterLabel label="Limit" />
									</Col>
									<Col flex="1 1 12.5rem">
										<LimitFilter query={query} onChange={handleChangeLimit} />
									</Col>
								</Row>
							</Col>
						)}

						{!filterConfigs?.having?.isHidden && (
							<Col span={11}>
								<Row gutter={[11, 5]}>
									<Col flex="5.93rem">
										<FilterLabel label="HAVING" />
									</Col>
									<Col flex="1 1 12.5rem">
										<HavingFilter
											entityVersion={version}
											onChange={handleChangeHavingFilter}
											query={query}
										/>
									</Col>
								</Row>
							</Col>
						)}
						<Col span={11}>
							<Row gutter={[11, 5]}>
								<Col flex="5.93rem">
									<FilterLabel label="Order by" />
								</Col>
								<Col flex="1 1 12.5rem">{renderOrderByFilter()}</Col>
							</Row>
						</Col>

						<Col span={11}>{renderAggregateEveryFilter()}</Col>
					</>
				);
			}
		}
	}, [
		panelType,
		query,
		handleChangeLimit,
		version,
		handleChangeHavingFilter,
		renderOrderByFilter,
		renderAggregateEveryFilter,
		filterConfigs?.limit?.isHidden,
		filterConfigs?.having?.isHidden,
	]);

	const disableOperatorSelector =
		!query?.aggregateAttribute.key || query?.aggregateAttribute.key === '';

	const isVersionV4 = version && version === ENTITY_VERSION_V4;

	return (
		<Row gutter={[0, 12]} className={`query-builder-${version}`}>
			<QBEntityOptions
				isMetricsDataSource={isMetricsDataSource}
				showFunctions={
					(version && version === ENTITY_VERSION_V4) ||
					query.dataSource === DataSource.LOGS ||
					showFunctions ||
					false
				}
				isCollapsed={isCollapse}
				entityType="query"
				entityData={query}
				onToggleVisibility={handleToggleDisableQuery}
				onDelete={handleDeleteQuery}
				onCloneQuery={cloneQuery}
				onCollapseEntity={handleToggleCollapsQuery}
				query={query}
				onQueryFunctionsUpdates={handleQueryFunctionsUpdates}
				showDeleteButton={currentQuery.builder.queryData.length > 1}
				isListViewPanel={isListViewPanel}
				index={index}
			/>

			{!isCollapse && (
				<Row gutter={[0, 12]} className="qb-container">
					<Col span={24}>
						<Row align="middle" gutter={[5, 11]}>
							{!isExplorerPage && (
								<Col>
									{queryVariant === 'dropdown' ? (
										<DataSourceDropdown
											onChange={handleChangeDataSource}
											value={query.dataSource}
											style={{ minWidth: '5.625rem' }}
											isListViewPanel={isListViewPanel}
										/>
									) : (
										<FilterLabel label={transformToUpperCase(query.dataSource)} />
									)}
								</Col>
							)}

							{isMetricsDataSource && (
								<Col span={12}>
									<Row gutter={[11, 5]}>
										{version && version === 'v3' && (
											<Col flex="5.93rem">
												<Tooltip
													title={
														<div style={{ textAlign: 'center' }}>
															Select Aggregate Operator
															<Typography.Link
																className="learn-more"
																href="https://signoz.io/docs/userguide/query-builder/?utm_source=product&utm_medium=query-builder#aggregation"
																target="_blank"
																style={{ textDecoration: 'underline' }}
															>
																{' '}
																<br />
																Learn more
															</Typography.Link>
														</div>
													}
												>
													<OperatorsSelect
														value={query.aggregateOperator}
														onChange={handleChangeOperator}
														operators={operators}
													/>
												</Tooltip>
											</Col>
										)}

										<Col flex="auto">
											<AggregatorFilter
												onChange={handleChangeAggregatorAttribute}
												query={query}
											/>
										</Col>

										{version &&
											version === ENTITY_VERSION_V4 &&
											operators &&
											Array.isArray(operators) &&
											operators.length > 0 && (
												<Col flex="5.93rem">
													<Tooltip
														title={
															<div style={{ textAlign: 'center' }}>
																Select Aggregate Operator
																<Typography.Link
																	className="learn-more"
																	href="https://signoz.io/docs/metrics-management/types-and-aggregation/?utm_source=product&utm_medium=query-builder#aggregation"
																	target="_blank"
																	style={{ textDecoration: 'underline' }}
																>
																	{' '}
																	<br />
																	Learn more
																</Typography.Link>
															</div>
														}
													>
														<OperatorsSelect
															value={query.aggregateOperator}
															onChange={handleChangeOperator}
															operators={operators}
															disabled={disableOperatorSelector}
														/>
													</Tooltip>
												</Col>
											)}
									</Row>
								</Col>
							)}

							<Col flex="1 1 40rem">
								<Row gutter={[11, 5]}>
									{isMetricsDataSource && (
										<Col>
											<FilterLabel label="WHERE" />
										</Col>
									)}
									<Col flex="1" className="qb-search-container">
										{query.dataSource === DataSource.LOGS ? (
											<QueryBuilderSearchV2
												query={query}
												onChange={handleChangeTagFilters}
												whereClauseConfig={filterConfigs?.filters}
											/>
										) : (
											<QueryBuilderSearch
												query={query}
												onChange={handleChangeTagFilters}
												whereClauseConfig={filterConfigs?.filters}
											/>
										)}
									</Col>
								</Row>
							</Col>
						</Row>
					</Col>
					{!isMetricsDataSource && !isListViewPanel && (
						<Col span={11}>
							<Row gutter={[11, 5]}>
								<Col flex="5.93rem">
									<Tooltip
										title={
											<div style={{ textAlign: 'center' }}>
												Select Aggregate Operator
												<Typography.Link
													href="https://signoz.io/docs/userguide/query-builder/?utm_source=product&utm_medium=query-builder#aggregation"
													target="_blank"
													style={{ textDecoration: 'underline' }}
												>
													{' '}
													<br />
													Learn more
												</Typography.Link>
											</div>
										}
									>
										<OperatorsSelect
											value={query.aggregateOperator}
											onChange={handleChangeOperator}
											operators={operators}
										/>
									</Tooltip>
								</Col>
								<Col flex="1 1 12.5rem">
									<AggregatorFilter
										query={query}
										onChange={handleChangeAggregatorAttribute}
										disabled={
											panelType === PANEL_TYPES.LIST || panelType === PANEL_TYPES.TRACE
										}
									/>
								</Col>
							</Row>
						</Col>
					)}
					{!isListViewPanel && (
						<Col span={24}>
							<Row gutter={[11, 5]}>
								<Col flex="5.93rem">
									{isVersionV4 && isMetricsDataSource ? (
										<SpaceAggregationOptions
											panelType={panelType}
											key={`${panelType}${query.spaceAggregation}${query.timeAggregation}`}
											aggregatorAttributeType={
												query?.aggregateAttribute.type as ATTRIBUTE_TYPES
											}
											selectedValue={query.spaceAggregation}
											disabled={disableOperatorSelector}
											onSelect={handleSpaceAggregationChange}
											operators={spaceAggregationOptions}
										/>
									) : (
										<FilterLabel
											label={panelType === PANEL_TYPES.VALUE ? 'Reduce to' : 'Group by'}
										/>
									)}
								</Col>

								<Col flex="1 1 12.5rem">
									{panelType === PANEL_TYPES.VALUE ? (
										<Row>
											{isVersionV4 && isMetricsDataSource && (
												<Col span={4}>
													<FilterLabel label="Reduce to" />
												</Col>
											)}
											<Col span={isVersionV4 && isMetricsDataSource ? 20 : 24}>
												<ReduceToFilter query={query} onChange={handleChangeReduceTo} />
											</Col>
										</Row>
									) : (
										<GroupByFilter
											disabled={isMetricsDataSource && !query.aggregateAttribute.key}
											query={query}
											onChange={handleChangeGroupByKeys}
										/>
									)}
								</Col>

								{isVersionV4 &&
									isMetricsDataSource &&
									(panelType === PANEL_TYPES.TABLE || panelType === PANEL_TYPES.PIE) && (
										<Col flex="1 1 12.5rem">
											<Row>
												<Col span={6}>
													<FilterLabel label="Reduce to" />
												</Col>

												<Col span={18}>
													<ReduceToFilter query={query} onChange={handleChangeReduceTo} />
												</Col>
											</Row>
										</Col>
									)}
							</Row>
						</Col>
					)}
					{!isTracePanelType && !isListViewPanel && (
						<Col span={24}>
							<AdditionalFiltersToggler
								listOfAdditionalFilter={listOfAdditionalFilters}
							>
								<Row gutter={[0, 11]} justify="space-between">
									{renderAdditionalFilters()}
								</Row>
							</AdditionalFiltersToggler>
						</Col>
					)}
					{isListViewPanel && (
						<Col span={24}>
							<Row gutter={[0, 11]} justify="space-between">
								{renderAdditionalFilters()}
							</Row>
						</Col>
					)}
					{panelType !== PANEL_TYPES.LIST && panelType !== PANEL_TYPES.TRACE && (
						<Row style={{ width: '100%' }}>
							<Tooltip
								placement="right"
								title={
									<div style={{ textAlign: 'center' }}>
										Name of legend
										<Typography.Link
											style={{ textDecoration: 'underline' }}
											href="https://signoz.io/docs/userguide/query-builder/?utm_source=product&utm_medium=query-builder#legend-format"
											target="_blank"
										>
											{' '}
											<br />
											Learn more
										</Typography.Link>
									</div>
								}
							>
								<Input
									onChange={handleChangeQueryLegend}
									size="middle"
									value={query.legend}
									addonBefore="Legend Format"
								/>
							</Tooltip>
						</Row>
					)}
				</Row>
			)}
		</Row>
	);
});
