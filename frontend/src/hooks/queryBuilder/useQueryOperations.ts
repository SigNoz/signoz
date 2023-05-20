import {
	initialAggregateAttribute,
	initialQueryBuilderFormValues,
	mapOfFilters,
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

export const useQueryOperations: UseQueryOperations = ({ query, index }) => {
	const {
		handleSetQueryData,
		removeEntityByIndex,
		panelType,
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
				filters: { items: [], op: 'AND' },
				...(shouldResetAggregateAttribute
					? { aggregateAttribute: initialAggregateAttribute }
					: {}),
			};

			handleSetQueryData(index, newQuery);
		},
		[index, query, handleSetQueryData],
	);

	const getNewListOfAdditionalFilters = useCallback(
		(dataSource: DataSource): string[] =>
			mapOfFilters[dataSource].map((item) => item.text),
		[],
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
				panelType,
			});

			const entries = Object.entries(initialQueryBuilderFormValues).filter(
				([key]) => key !== 'queryName' && key !== 'expression',
			);

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
		removeEntityByIndex('queryData', index);
	}, [removeEntityByIndex, index]);

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

	useEffect(() => {
		const initialOperators = getOperatorsBySourceAndPanelType({
			dataSource,
			panelType,
		});
		setOperators(initialOperators);
	}, [dataSource, panelType]);

	useEffect(() => {
		const additionalFilters = getNewListOfAdditionalFilters(dataSource);

		setListOfAdditionalFilters(additionalFilters);
	}, [dataSource, aggregateOperator, getNewListOfAdditionalFilters]);

	return {
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
