import { Col, Input, Row } from 'antd';
// ** Constants
import { mapOfFilters, mapOfOperators } from 'constants/queryBuilder';
// ** Components
import {
	AdditionalFiltersToggler,
	DataSourceDropdown,
	FilterLabel,
	ListMarker,
} from 'container/QueryBuilder/components';
import {
	AggregatorFilter,
	GroupByFilter,
	OperatorsSelect,
	ReduceToFilter,
} from 'container/QueryBuilder/filters';
// Context
import { useQueryBuilder } from 'hooks/useQueryBuilder';
// ** Hooks
import React, { memo, useCallback, useMemo } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';
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
	const { handleSetQueryData } = useQueryBuilder();

	const currentListOfOperators = useMemo(
		() => mapOfOperators[query.dataSource],
		[query],
	);
	const listOfAdditionalFilters = useMemo(() => mapOfFilters[query.dataSource], [
		query,
	]);

	const handleChangeOperator = useCallback(
		(value: string): void => {
			handleSetQueryData(index, { aggregateOperator: value });
		},
		[index, handleSetQueryData],
	);

	const handleChangeDataSource = useCallback(
		(nextSource: DataSource): void => {
			handleSetQueryData(index, { dataSource: nextSource });
		},
		[index, handleSetQueryData],
	);

	const handleToggleDisableQuery = useCallback((): void => {
		handleSetQueryData(index, { disabled: !query.disabled });
	}, [index, handleSetQueryData, query]);

	const handleChangeAggregatorAttribute = useCallback(
		(value: BaseAutocompleteData): void => {
			handleSetQueryData(index, { aggregateAttribute: value });
		},
		[index, handleSetQueryData],
	);

	const handleChangeGroupByKeys = useCallback(
		(values: BaseAutocompleteData[]): void => {
			handleSetQueryData(index, { groupBy: values });
		},
		[index, handleSetQueryData],
	);

	const handleChangeQueryLegend = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>): void => {
			handleSetQueryData(index, { legend: e.target.value });
		},
		[index, handleSetQueryData],
	);

	const handleChangeReduceTo = useCallback(
		(value: string): void => {
			handleSetQueryData(index, { reduceTo: value });
		},
		[index, handleSetQueryData],
	);

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
					<Col flex="5.93rem">
						<OperatorsSelect
							value={query.aggregateOperator || currentListOfOperators[0]}
							onChange={handleChangeOperator}
							operators={currentListOfOperators}
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
						<FilterLabel label={panelType === 'VALUE' ? 'Reduce to' : 'Group by'} />
					</Col>
					<Col flex="1 1 12.5rem">
						{panelType === 'VALUE' ? (
							<ReduceToFilter query={query} onChange={handleChangeReduceTo} />
						) : (
							<GroupByFilter query={query} onChange={handleChangeGroupByKeys} />
						)}
					</Col>
				</Row>
			</Col>
			<Col span={24}>
				<AdditionalFiltersToggler listOfAdditionalFilter={listOfAdditionalFilters}>
					{/* TODO: Render filter by Col component */}
					test additional filter
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
		</Row>
	);
});
