import {
	initialAutocompleteData,
	initialQueryBuilderFormValuesMap,
	mapOfFilters,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { getOperatorsBySourceAndPanelType } from 'lib/newQueryBuilder/getOperatorsBySourceAndPanelType';
import { findDataTypeOfOperator } from 'lib/query/findDataTypeOfOperator';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import {
	HandleChangeQueryData,
	UseQueryOperations,
} from 'types/common/operations.types';
import { DataSource } from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';

export const useQueryOperations: UseQueryOperations = ({
	query,
	index,
	filterConfigs,
}) => {
	const {
		handleSetQueryData,
		removeQueryBuilderEntityByIndex,
		panelType,
		initialDataSource,
		currentQuery,
	} = useQueryBuilder();
	const [operators, setOperators] = useState<SelectOption<string, string>[]>([]);
	const [listOfAdditionalFilters, setListOfAdditionalFilters] = useState<
		string[]
	>([]);

	const { dataSource, aggregateOperator } = query;

	const handleChangeOperator = useCallback(
		(value: string): void => {
			const aggregateDataType: BaseAutocompleteData['dataType'] =
				query.aggregateAttribute.dataType;

			const typeOfValue = findDataTypeOfOperator(value);
			const shouldResetAggregateAttribute =
				(aggregateDataType === 'string' || aggregateDataType === 'bool') &&
				typeOfValue === 'number';

			const newQuery: IBuilderQuery = {
				...query,
				aggregateOperator: value,
				having: [],
				limit: null,
				...(shouldResetAggregateAttribute
					? { aggregateAttribute: initialAutocompleteData }
					: {}),
			};

			handleSetQueryData(index, newQuery);
		},
		[index, query, handleSetQueryData],
	);

	const getNewListOfAdditionalFilters = useCallback(
		(dataSource: DataSource): string[] => {
			const additionalFiltersKeys: (keyof Pick<
				IBuilderQuery,
				'orderBy' | 'limit' | 'having' | 'stepInterval'
			>)[] = ['having', 'limit', 'orderBy', 'stepInterval'];

			const result: string[] = mapOfFilters[dataSource].reduce<string[]>(
				(acc, item) => {
					if (
						filterConfigs &&
						filterConfigs[item.field as typeof additionalFiltersKeys[number]]
							?.isHidden
					) {
						return acc;
					}

					acc.push(item.text);

					return acc;
				},
				[],
			);

			return result;
		},

		[filterConfigs],
	);

	const handleChangeAggregatorAttribute = useCallback(
		(value: BaseAutocompleteData): void => {
			const newQuery: IBuilderQuery = {
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
			const newOperators = getOperatorsBySourceAndPanelType({
				dataSource: nextSource,
				panelType: panelType || PANEL_TYPES.TIME_SERIES,
			});

			const entries = Object.entries(
				initialQueryBuilderFormValuesMap.metrics,
			).filter(([key]) => key !== 'queryName' && key !== 'expression');

			const initCopyResult = Object.fromEntries(entries);

			const newQuery: IBuilderQuery = {
				...query,
				...initCopyResult,
				dataSource: nextSource,
				aggregateOperator: newOperators[0].value,
			};

			setOperators(newOperators);
			handleSetQueryData(index, newQuery);
		},
		[index, query, panelType, handleSetQueryData],
	);

	const handleDeleteQuery = useCallback(() => {
		if (currentQuery.builder.queryData.length > 1) {
			removeQueryBuilderEntityByIndex('queryData', index);
		}
	}, [removeQueryBuilderEntityByIndex, index, currentQuery]);

	const handleChangeQueryData: HandleChangeQueryData = useCallback(
		(key, value) => {
			const newQuery: IBuilderQuery = {
				...query,
				[key]: value,
			};

			handleSetQueryData(index, newQuery);
		},
		[query, index, handleSetQueryData],
	);

	const isMetricsDataSource = useMemo(
		() => query.dataSource === DataSource.METRICS,
		[query.dataSource],
	);
	const isTracePanelType = useMemo(() => panelType === PANEL_TYPES.TRACE, [
		panelType,
	]);

	useEffect(() => {
		if (initialDataSource && dataSource !== initialDataSource) return;

		const initialOperators = getOperatorsBySourceAndPanelType({
			dataSource,
			panelType: panelType || PANEL_TYPES.TIME_SERIES,
		});

		if (JSON.stringify(operators) === JSON.stringify(initialOperators)) return;

		setOperators(initialOperators);
	}, [dataSource, initialDataSource, panelType, operators]);

	useEffect(() => {
		const additionalFilters = getNewListOfAdditionalFilters(dataSource);

		setListOfAdditionalFilters(additionalFilters);
	}, [dataSource, aggregateOperator, getNewListOfAdditionalFilters]);

	return {
		isTracePanelType,
		isMetricsDataSource,
		operators,
		listOfAdditionalFilters,
		handleChangeOperator,
		handleChangeAggregatorAttribute,
		handleChangeDataSource,
		handleDeleteQuery,
		handleChangeQueryData,
	};
};
