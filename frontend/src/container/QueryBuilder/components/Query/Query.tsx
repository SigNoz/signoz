/* eslint-disable react/jsx-props-no-spreading */
import { Col, Row } from 'antd';
// ** Components
import {
	DataSourceDropdown,
	FilterLabel,
	ListMarker,
} from 'container/QueryBuilder/components';
import {
	AggregatorFilter,
	GroupByFilter,
	OperatorsSelect,
} from 'container/QueryBuilder/filters';
// Context
import { useQueryBuilder } from 'hooks/useQueryBuilder';
// ** Hooks
import React from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';
// ** Constants
import {
	LogsAggregatorOperator,
	MetricAggregateOperator,
	TracesAggregatorOperator,
} from 'types/common/queryBuilder';
import { transformToUpperCase } from 'utils/transformToUpperCase';

// ** Types
import { QueryProps } from './Query.interfaces';

const mapOfOperators: Record<DataSource, string[]> = {
	metrics: Object.values(MetricAggregateOperator),
	logs: Object.values(LogsAggregatorOperator),
	traces: Object.values(TracesAggregatorOperator),
};

export function Query({
	index,
	isAvailableToDisable,
	queryVariant,
	query,
}: QueryProps): JSX.Element {
	const { handleSetQueryData } = useQueryBuilder();

	const currentListOfOperators = mapOfOperators[query.dataSource];

	const handleChangeOperator = (value: string): void => {
		handleSetQueryData(index, { aggregateOperator: value });
	};

	const handleChangeDataSource = (nextSource: DataSource): void => {
		handleSetQueryData(index, { dataSource: nextSource });
	};

	const handleToggleDisableQuery = (): void => {
		handleSetQueryData(index, { disabled: !query.disabled });
	};

	const handleChangeAggregatorAttribute = (
		value: BaseAutocompleteData,
	): void => {
		handleSetQueryData(index, { aggregateAttribute: value });
	};

	const handleChangeGroupByKeys = (values: BaseAutocompleteData[]): void => {
		handleSetQueryData(index, { groupBy: values });
	};

	return (
		<Row gutter={[0, 15]}>
			<Col span={24}>
				<Row wrap={false} align="middle">
					<Col span={24}>
						<ListMarker
							isDisabled={query.disabled}
							toggleDisabled={handleToggleDisableQuery}
							labelName={query.queryName}
							index={index}
							isAvailableToDisable={isAvailableToDisable}
						/>
						{queryVariant === 'dropdown' ? (
							<DataSourceDropdown
								onChange={handleChangeDataSource}
								value={query.dataSource}
							/>
						) : (
							<FilterLabel label={transformToUpperCase(query.dataSource)} />
						)}
						{/* TODO: here will be search */}
					</Col>
				</Row>
			</Col>
			<Col span={11}>
				<Row gutter={[11, 5]}>
					<Col flex="95px">
						<OperatorsSelect
							value={query.aggregateOperator || currentListOfOperators[0]}
							onChange={handleChangeOperator}
							operators={currentListOfOperators}
						/>
					</Col>
					<Col flex="1 1 200px">
						<AggregatorFilter
							onChange={handleChangeAggregatorAttribute}
							query={query}
						/>
					</Col>
				</Row>
			</Col>
			<Col span={11} offset={2}>
				<Row gutter={[11, 5]}>
					<Col flex="95px">
						<FilterLabel label="Group by" />
					</Col>
					<Col flex="1 1 200px">
						<GroupByFilter query={query} onChange={handleChangeGroupByKeys} />
					</Col>
				</Row>
			</Col>
		</Row>
	);
}
