import {
	initialAggregateAttribute,
	initialQueryBuilderFormValues,
	mapOfOperators,
} from 'constants/queryBuilder';
import { ITEMS } from 'container/NewDashboard/ComponentsSlider/menuItems';
import { QueryProps } from 'container/QueryBuilder/components/Query/Query.interfaces';
import { useQueryBuilderContext } from 'hooks/queryBuilder/useQueryBuilderContext';
import { findDataTypeOfOperator } from 'lib/query/findDataTypeOfOperator';
import React, {
	ChangeEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	Having,
	IBuilderQueryForm,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import {
	DataSource,
	ReduceOperators,
	StringOperators,
} from 'types/common/queryBuilder';

type UseQueryOperationsParams = Pick<
	QueryProps,
	'index' | 'panelType' | 'query'
>;

type UseQueryOperations = (
	params: UseQueryOperationsParams,
) => {
	isMetricsDataSource: boolean;
	operators: string[];
	handleChangeOperator: (value: string) => void;
	handleChangeAggregatorAttribute: (value: BaseAutocompleteData) => void;
	handleChangeDataSource: (newSource: DataSource) => void;
	handleToggleDisableQuery: () => void;
	handleChangeGroupByKeys: (values: BaseAutocompleteData[]) => void;
	handleChangeQueryLegend: (e: ChangeEvent<HTMLInputElement>) => void;
	handleChangeReduceTo: (value: ReduceOperators) => void;
	handleChangeHavingFilter: (having: Having[]) => void;
	handleDeleteQuery: () => void;
	handleChangeOrderByKeys: (value: BaseAutocompleteData[]) => void;
	handleChangeLimit: (value: number | null) => void;
	handleChangeAggregateEvery: (value: number) => void;
	handleChangeTagFilters: (value: TagFilter) => void;
};

export const useQueryOperations: UseQueryOperations = ({
	query,
	index,
	panelType,
}) => {
	const { handleSetQueryData, removeEntityByIndex } = useQueryBuilderContext();
	const [operators, setOperators] = useState<string[]>([]);

	const { dataSource } = query;

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

	const getNewOperators = useCallback(
		(dataSource: DataSource, currentPanelType: ITEMS): string[] => {
			let operatorsByDataSource = mapOfOperators[dataSource];

			if (dataSource !== DataSource.METRICS && currentPanelType !== 'list') {
				operatorsByDataSource = operatorsByDataSource.filter(
					(operator) => operator !== StringOperators.NOOP,
				);
			}

			return operatorsByDataSource;
		},
		[],
	);

	const handleChangeAggregatorAttribute = useCallback(
		(value: BaseAutocompleteData): void => {
			const newQuery: IBuilderQueryForm = {
				...query,
				aggregateAttribute: value,
				having: [],
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

			const newOperators = getNewOperators(nextSource, panelType);

			const initCopy = {
				...(initialQueryBuilderFormValues as Partial<IBuilderQueryForm>),
			};
			delete initCopy.queryName;
			delete initCopy.expression;

			newQuery = {
				...newQuery,
				...initCopy,
				dataSource: nextSource,
				aggregateOperator: newOperators[0],
			};

			setOperators(newOperators);
			handleSetQueryData(index, newQuery);
		},
		[index, query, panelType, handleSetQueryData, getNewOperators],
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
		(value: ReduceOperators): void => {
			const newQuery: IBuilderQueryForm = {
				...query,
				reduceTo: value,
			};
			handleSetQueryData(index, newQuery);
		},
		[index, query, handleSetQueryData],
	);

	const handleChangeHavingFilter = useCallback(
		(having: Having[]) => {
			const newQuery: IBuilderQueryForm = { ...query, having };

			handleSetQueryData(index, newQuery);
		},
		[index, query, handleSetQueryData],
	);

	const handleDeleteQuery = useCallback(() => {
		removeEntityByIndex('queryData', index);
	}, [removeEntityByIndex, index]);

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

	const isMetricsDataSource = useMemo(
		() => query.dataSource === DataSource.METRICS,
		[query.dataSource],
	);

	useEffect(() => {
		if (operators.length === 0) {
			const initialOperators = getNewOperators(dataSource, panelType);
			setOperators(initialOperators);
		}
	}, [operators, dataSource, panelType, getNewOperators]);

	return {
		isMetricsDataSource,
		operators,
		handleChangeOperator,
		handleChangeAggregatorAttribute,
		handleChangeDataSource,
		handleToggleDisableQuery,
		handleChangeGroupByKeys,
		handleChangeQueryLegend,
		handleChangeReduceTo,
		handleChangeHavingFilter,
		handleDeleteQuery,
		handleChangeOrderByKeys,
		handleChangeLimit,
		handleChangeAggregateEvery,
		handleChangeTagFilters,
	};
};
