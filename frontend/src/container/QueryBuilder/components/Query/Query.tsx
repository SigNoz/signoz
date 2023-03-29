/* eslint-disable react/jsx-props-no-spreading */
import { Col, Row } from 'antd';
// ** Components
import { ListMarker, QueryLabel } from 'container/QueryBuilder/components';
import {
	AggregatorFilter,
	OperatorsSelect,
} from 'container/QueryBuilder/filters';
// Context
import { useQueryBuilder } from 'hooks/useQueryBuilder';
// ** Hooks
import React from 'react';
import { AutocompleteDataLabeled } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';
// ** Constants
import {
	LogsAggregatorOperator,
	MetricAggregateOperator,
	TracesAggregatorOperator,
} from 'types/common/queryBuilder';

import { QueryLabelProps } from '../QueryLabel/QueryLabel.interfaces';
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
		value: AutocompleteDataLabeled,
	): void => {
		handleSetQueryData(index, { aggregateAttribute: value });
	};

	const queryLabelProps: QueryLabelProps =
		queryVariant === 'dropdown'
			? {
					variant: 'dropdown',
					onChange: handleChangeDataSource,
					value: query.dataSource,
			  }
			: { variant: 'static', dataSource: query.dataSource };

	return (
		<Row style={{ gap: '0.75rem' }}>
			<Col span={12}>
				<ListMarker
					isDisabled={query.disabled}
					toggleDisabled={handleToggleDisableQuery}
					labelName={query.queryName}
					index={index}
					isAvailableToDisable={isAvailableToDisable}
				/>
				<QueryLabel {...queryLabelProps} style={{ marginRight: '0.5rem' }} />
			</Col>
			<Col span={24}>
				<OperatorsSelect
					value={query.aggregateOperator || currentListOfOperators[0]}
					onChange={handleChangeOperator}
					operators={currentListOfOperators}
					style={{ minWidth: 104, marginRight: '0.75rem' }}
				/>
				<AggregatorFilter
					onChange={handleChangeAggregatorAttribute}
					query={query}
				/>
			</Col>
		</Row>
	);
}
