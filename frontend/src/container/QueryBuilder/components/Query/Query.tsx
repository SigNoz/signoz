import { Col, Input, Row } from 'antd';
// ** Constants
import { mapOfFilters } from 'constants/queryBuilder';
// ** Components
import {
	AdditionalFiltersToggler,
	DataSourceDropdown,
	FilterLabel,
	ListItemWrapper,
	ListMarker,
} from 'container/QueryBuilder/components';
import {
	AggregatorFilter,
	GroupByFilter,
	HavingFilter,
	OperatorsSelect,
	ReduceToFilter,
} from 'container/QueryBuilder/filters';
import AggregateEveryFilter from 'container/QueryBuilder/filters/AggregateEveryFilter';
import LimitFilter from 'container/QueryBuilder/filters/LimitFilter/LimitFilter';
import { OrderByFilter } from 'container/QueryBuilder/filters/OrderByFilter';
import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryOperations';
// ** Hooks
import React, { memo, ReactNode, useCallback, useMemo } from 'react';
import { StringOperators } from 'types/common/queryBuilder';
import { transformToUpperCase } from 'utils/transformToUpperCase';

// ** Types
import { QueryProps } from './Query.interfaces';

export const Query = memo(function Query({
	index,
	isAvailableToDisable,
	queryVariant,
	query,
	panelType,
}: QueryProps): JSX.Element {
	const {
		operators,
		isMetricsDataSource,
		handleChangeAggregateEvery,
		handleChangeAggregatorAttribute,
		handleChangeDataSource,
		handleChangeGroupByKeys,
		handleChangeHavingFilter,
		handleChangeLimit,
		handleChangeOperator,
		handleChangeOrderByKeys,
		handleChangeQueryLegend,
		handleChangeReduceTo,
		handleChangeTagFilters,
		handleDeleteQuery,
		handleToggleDisableQuery,
	} = useQueryOperations({ index, query, panelType });

	const listOfAdditionalFilters = useMemo(() => mapOfFilters[query.dataSource], [
		query,
	]);

	const renderAdditionalFilters = useCallback((): ReactNode => {
		switch (panelType) {
			case 'graph': {
				return (
					<>
						{!isMetricsDataSource && (
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
						{query.aggregateOperator !== StringOperators.NOOP && (
							<Col span={11}>
								<Row gutter={[11, 5]}>
									<Col flex="5.93rem">
										<FilterLabel label="HAVING" />
									</Col>
									<Col flex="1 1 12.5rem">
										<HavingFilter onChange={handleChangeHavingFilter} query={query} />
									</Col>
								</Row>
							</Col>
						)}
						{!isMetricsDataSource && (
							<Col span={11}>
								<Row gutter={[11, 5]}>
									<Col flex="5.93rem">
										<FilterLabel label="Order by" />
									</Col>
									<Col flex="1 1 12.5rem">
										<OrderByFilter query={query} onChange={handleChangeOrderByKeys} />
									</Col>
								</Row>
							</Col>
						)}

						<Col span={11}>
							<Row gutter={[11, 5]}>
								<Col flex="5.93rem">
									<FilterLabel label="Aggregate Every" />
								</Col>
								<Col flex="1 1 6rem">
									<AggregateEveryFilter
										query={query}
										onChange={handleChangeAggregateEvery}
									/>
								</Col>
							</Row>
						</Col>
					</>
				);
			}

			case 'value': {
				return (
					<>
						{query.aggregateOperator !== StringOperators.NOOP && (
							<Col span={11}>
								<Row gutter={[11, 5]}>
									<Col flex="5.93rem">
										<FilterLabel label="HAVING" />
									</Col>
									<Col flex="1 1 12.5rem">
										<HavingFilter onChange={handleChangeHavingFilter} query={query} />
									</Col>
								</Row>
							</Col>
						)}
						<Col span={11}>
							<Row gutter={[11, 5]}>
								<Col flex="5.93rem">
									<FilterLabel label="Aggregate Every" />
								</Col>
								<Col flex="1 1 6rem">
									<AggregateEveryFilter
										query={query}
										onChange={handleChangeAggregateEvery}
									/>
								</Col>
							</Row>
						</Col>
					</>
				);
			}

			default: {
				return null;
			}
		}
	}, [
		panelType,
		query,
		isMetricsDataSource,
		handleChangeAggregateEvery,
		handleChangeHavingFilter,
		handleChangeLimit,
		handleChangeOrderByKeys,
	]);

	return (
		<ListItemWrapper onDelete={handleDeleteQuery}>
			<Col span={24}>
				<Row align="middle">
					<Col>
						<ListMarker
							isDisabled={query.disabled}
							onDisable={handleToggleDisableQuery}
							labelName={query.queryName}
							index={index}
							isAvailableToDisable={isAvailableToDisable}
						/>
						{queryVariant === 'dropdown' ? (
							<DataSourceDropdown
								onChange={handleChangeDataSource}
								value={query.dataSource}
								style={{ marginRight: '0.5rem', minWidth: '90px' }}
							/>
						) : (
							<FilterLabel label={transformToUpperCase(query.dataSource)} />
						)}
					</Col>
					<Col flex="1">
						<Row gutter={[11, 5]}>
							{isMetricsDataSource && (
								<Col>
									<FilterLabel label="WHERE" />
								</Col>
							)}
							<Col flex="1">
								<QueryBuilderSearch query={query} onChange={handleChangeTagFilters} />
							</Col>
						</Row>
					</Col>
				</Row>
			</Col>
			<Col span={11}>
				<Row gutter={[11, 5]}>
					<Col flex="5.93rem">
						<OperatorsSelect
							value={query.aggregateOperator}
							onChange={handleChangeOperator}
							operators={operators}
						/>
					</Col>
					<Col flex="1 1 12.5rem">
						<AggregatorFilter
							onChange={handleChangeAggregatorAttribute}
							query={query}
						/>
					</Col>
				</Row>
			</Col>

			<Col span={11} offset={2}>
				<Row gutter={[11, 5]}>
					<Col flex="5.93rem">
						<FilterLabel label={panelType === 'value' ? 'Reduce to' : 'Group by'} />
					</Col>
					<Col flex="1 1 12.5rem">
						{panelType === 'value' ? (
							<ReduceToFilter query={query} onChange={handleChangeReduceTo} />
						) : (
							<GroupByFilter
								disabled={isMetricsDataSource && !query.aggregateAttribute.key}
								query={query}
								onChange={handleChangeGroupByKeys}
							/>
						)}
					</Col>
				</Row>
			</Col>
			<Col span={24}>
				<AdditionalFiltersToggler listOfAdditionalFilter={listOfAdditionalFilters}>
					<Row gutter={[0, 11]} justify="space-between">
						{renderAdditionalFilters()}
					</Row>
				</AdditionalFiltersToggler>
			</Col>
			<Row style={{ width: '100%' }}>
				<Input
					onChange={handleChangeQueryLegend}
					size="middle"
					value={query.legend}
					addonBefore="Legend Format"
				/>
			</Row>
		</ListItemWrapper>
	);
});
