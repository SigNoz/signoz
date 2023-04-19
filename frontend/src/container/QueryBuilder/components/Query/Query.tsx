import { Col, Input, Row } from 'antd';
// ** Constants
import {
	initialAggregateAttribute,
	initialQueryBuilderFormValues,
	mapOfFilters,
	mapOfOperators,
} from 'constants/queryBuilder';
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
import AggregateEveryFilter from 'container/QueryBuilder/filters/AggregateEveryFilter';
import LimitFilter from 'container/QueryBuilder/filters/LimitFilter/LimitFilter';
import { OrderByFilter } from 'container/QueryBuilder/filters/OrderByFilter';
import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import { useQueryBuilder } from 'hooks/useQueryBuilder';
import { findDataTypeOfOperator } from 'lib/query/findDataTypeOfOperator';
// ** Hooks
import React, { memo, useCallback, useMemo } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQueryForm,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { transformToUpperCase } from 'utils/transformToUpperCase';

// ** Types
import { QueryProps } from './Query.interfaces';
// ** Styles
import { StyledDeleteEntity, StyledFilterRow, StyledRow } from './Query.styled';

export const Query = memo(function Query({
	index,
	isAvailableToDisable,
	queryVariant,
	query,
	panelType,
}: QueryProps): JSX.Element {
	const {
		handleSetQueryData,
		removeEntityByIndex,
		initialDataSource,
	} = useQueryBuilder();

	const currentListOfOperators = useMemo(
		() => mapOfOperators[query.dataSource],
		[query],
	);
	const listOfAdditionalFilters = useMemo(() => mapOfFilters[query.dataSource], [
		query,
	]);

	const handleChangeOperator = useCallback(
		(value: string): void => {
			const aggregateDataType: BaseAutocompleteData['dataType'] =
				query.aggregateAttribute.dataType;

			const newQuery: IBuilderQueryForm = {
				...query,
				aggregateOperator: value,
				having: [],
				groupBy: [],
				orderBy: [],
				limit: null,
				tagFilters: { items: [], op: 'AND' },
			};

			if (!aggregateDataType) {
				handleSetQueryData(index, newQuery);
				return;
			}

			switch (aggregateDataType) {
				case 'string':
				case 'bool': {
					const typeOfValue = findDataTypeOfOperator(value);

					handleSetQueryData(index, {
						...newQuery,
						...(typeOfValue === 'number'
							? { aggregateAttribute: initialAggregateAttribute }
							: {}),
					});

					break;
				}
				case 'float64':
				case 'int64': {
					handleSetQueryData(index, newQuery);

					break;
				}

				default: {
					handleSetQueryData(index, newQuery);
					break;
				}
			}
		},
		[index, query, handleSetQueryData],
	);

	const handleChangeAggregatorAttribute = useCallback(
		(value: BaseAutocompleteData): void => {
			const newQuery: IBuilderQueryForm = {
				...query,
				aggregateAttribute: value,
			};

			handleSetQueryData(index, newQuery);
		},
		[index, query, handleSetQueryData],
	);

	const handleChangeDataSource = useCallback(
		(nextSource: DataSource): void => {
			let newQuery: IBuilderQueryForm = {
				...query,
				dataSource: nextSource,
			};

			if (nextSource !== query.dataSource) {
				const initCopy = {
					...(initialQueryBuilderFormValues as Partial<IBuilderQueryForm>),
				};
				delete initCopy.queryName;

				newQuery = {
					...newQuery,
					...initCopy,
					dataSource: initialDataSource || nextSource,
					aggregateOperator: mapOfOperators[nextSource][0],
				};
			}

			handleSetQueryData(index, newQuery);
		},
		[index, query, initialDataSource, handleSetQueryData],
	);

	const handleToggleDisableQuery = useCallback((): void => {
		const newQuery: IBuilderQueryForm = {
			...query,
			disabled: !query.disabled,
		};

		handleSetQueryData(index, newQuery);
	}, [index, query, handleSetQueryData]);

	const handleChangeGroupByKeys = useCallback(
		(values: BaseAutocompleteData[]): void => {
			const newQuery: IBuilderQueryForm = {
				...query,
				groupBy: values,
			};

			handleSetQueryData(index, newQuery);
		},
		[index, query, handleSetQueryData],
	);

	const handleChangeQueryLegend = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>): void => {
			const newQuery: IBuilderQueryForm = {
				...query,
				legend: e.target.value,
			};
			handleSetQueryData(index, newQuery);
		},
		[index, query, handleSetQueryData],
	);

	const handleChangeReduceTo = useCallback(
		(value: string): void => {
			const newQuery: IBuilderQueryForm = {
				...query,
				reduceTo: value,
			};
			handleSetQueryData(index, newQuery);
		},
		[index, query, handleSetQueryData],
	);

	const handleDeleteQuery = useCallback(() => {
		removeEntityByIndex('queryData', index);
	}, [removeEntityByIndex, index]);

	const isMatricsDataSource = useMemo(
		() => query.dataSource === DataSource.METRICS,
		[query.dataSource],
	);

	const handleChangeOrderByKeys = useCallback(
		(values: BaseAutocompleteData[]): void => {
			const newQuery: IBuilderQueryForm = {
				...query,
				orderBy: values,
			};
			handleSetQueryData(index, newQuery);
		},
		[handleSetQueryData, index, query],
	);

	const handleChangeLimit = useCallback(
		(value: number | null): void => {
			const newQuery: IBuilderQueryForm = {
				...query,
				limit: value,
			};
			handleSetQueryData(index, newQuery);
		},
		[index, query, handleSetQueryData],
	);

	const handleChangeAggregateEvery = useCallback(
		(value: number): void => {
			const newQuery: IBuilderQueryForm = {
				...query,
				stepInterval: value,
			};
			handleSetQueryData(index, newQuery);
		},
		[index, query, handleSetQueryData],
	);

	const handleChangeTagFilters = useCallback(
		(value: TagFilter): void => {
			const newQuery: IBuilderQueryForm = {
				...query,
				tagFilters: value,
			};
			handleSetQueryData(index, newQuery);
		},
		[index, query, handleSetQueryData],
	);

	return (
		<StyledRow gutter={[0, 15]}>
			<StyledDeleteEntity onClick={handleDeleteQuery} />
			<Col span={24}>
				<Row align="middle" justify="space-between">
					<Col>
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
								style={{ marginRight: '0.5rem' }}
							/>
						) : (
							<FilterLabel label={transformToUpperCase(query.dataSource)} />
						)}
						{isMatricsDataSource && <FilterLabel label="WHERE" />}
					</Col>
					<Col span={isMatricsDataSource ? 17 : 20}>
						<QueryBuilderSearch query={query} onChange={handleChangeTagFilters} />
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
					{!isMatricsDataSource && (
						<StyledFilterRow gutter={[11, 5]} justify="space-around">
							<Col span={2}>
								<FilterLabel label="Order by" />
							</Col>
							<Col span={10}>
								<OrderByFilter query={query} onChange={handleChangeOrderByKeys} />
							</Col>
							<Col span={1.5}>
								<FilterLabel label="Limit" />
							</Col>
							<Col span={10}>
								<LimitFilter query={query} onChange={handleChangeLimit} />
							</Col>
						</StyledFilterRow>
					)}
					<Row gutter={[11, 5]}>
						<Col span={3}>
							<FilterLabel label="Aggregate Every" />
						</Col>
						<Col span={8}>
							<AggregateEveryFilter
								query={query}
								onChange={handleChangeAggregateEvery}
							/>
						</Col>
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
		</StyledRow>
	);
});
