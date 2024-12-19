import { ENTITY_VERSION_V4 } from 'constants/app';
import { LEGEND } from 'constants/global';
import {
	ATTRIBUTE_TYPES,
	initialAutocompleteData,
	initialQueryBuilderFormValuesMap,
	mapOfFormulaToFilters,
	mapOfQueryFilters,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import {
	metricsGaugeSpaceAggregateOperatorOptions,
	metricsHistogramSpaceAggregateOperatorOptions,
	metricsSumSpaceAggregateOperatorOptions,
} from 'constants/queryBuilderOperators';
import {
	listViewInitialLogQuery,
	listViewInitialTraceQuery,
} from 'container/NewDashboard/ComponentsSlider/constants';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { getMetricsOperatorsByAttributeType } from 'lib/newQueryBuilder/getMetricsOperatorsByAttributeType';
import { getOperatorsBySourceAndPanelType } from 'lib/newQueryBuilder/getOperatorsBySourceAndPanelType';
import { findDataTypeOfOperator } from 'lib/query/findDataTypeOfOperator';
import { useCallback, useEffect, useState } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderFormula,
	IBuilderQuery,
	QueryFunctionProps,
} from 'types/api/queryBuilder/queryBuilderData';
import {
	HandleChangeFormulaData,
	HandleChangeQueryData,
	UseQueryOperations,
} from 'types/common/operations.types';
import { DataSource, MetricAggregateOperator } from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';
import { getFormatedLegend } from 'utils/getFormatedLegend';

export const useQueryOperations: UseQueryOperations = ({
	query,
	index,
	filterConfigs,
	formula,
	isListViewPanel = false,
	entityVersion,
}) => {
	const {
		handleSetQueryData,
		handleSetFormulaData,
		removeQueryBuilderEntityByIndex,
		panelType,
		initialDataSource,
		currentQuery,
		setLastUsedQuery,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();

	const [operators, setOperators] = useState<SelectOption<string, string>[]>([]);
	const [spaceAggregationOptions, setSpaceAggregationOptions] = useState<
		SelectOption<string, string>[]
	>([]);

	const { dataSource, aggregateOperator } = query;

	const getNewListOfAdditionalFilters = useCallback(
		(dataSource: DataSource, isQuery: boolean): string[] => {
			const additionalFiltersKeys: (keyof Pick<
				IBuilderQuery,
				'orderBy' | 'limit' | 'having' | 'stepInterval'
			>)[] = ['having', 'limit', 'orderBy', 'stepInterval'];

			const mapsOfFilters = isQuery ? mapOfQueryFilters : mapOfFormulaToFilters;

			const result: string[] = mapsOfFilters[dataSource]?.reduce<string[]>(
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

	const [listOfAdditionalFilters, setListOfAdditionalFilters] = useState<
		string[]
	>(getNewListOfAdditionalFilters(dataSource, true));

	const [
		listOfAdditionalFormulaFilters,
		setListOfAdditionalFormulaFilters,
	] = useState<string[]>(getNewListOfAdditionalFilters(dataSource, false));

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
				timeAggregation: value,
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

	const handleSpaceAggregationChange = useCallback(
		(value: string): void => {
			const newQuery: IBuilderQuery = {
				...query,
				spaceAggregation: value,
			};

			handleSetQueryData(index, newQuery);
		},
		[index, query, handleSetQueryData],
	);

	const handleMetricAggregateAtributeTypes = useCallback(
		(aggregateAttribute: BaseAutocompleteData): any => {
			const newOperators = getMetricsOperatorsByAttributeType({
				dataSource: DataSource.METRICS,
				panelType: panelType || PANEL_TYPES.TIME_SERIES,
				aggregateAttributeType:
					(aggregateAttribute.type as ATTRIBUTE_TYPES) || ATTRIBUTE_TYPES.GAUGE,
			});

			switch (aggregateAttribute.type) {
				case ATTRIBUTE_TYPES.SUM:
					setSpaceAggregationOptions(metricsSumSpaceAggregateOperatorOptions);
					break;
				case ATTRIBUTE_TYPES.GAUGE:
					setSpaceAggregationOptions(metricsGaugeSpaceAggregateOperatorOptions);
					break;

				case ATTRIBUTE_TYPES.HISTOGRAM:
					setSpaceAggregationOptions(metricsHistogramSpaceAggregateOperatorOptions);
					break;

				case ATTRIBUTE_TYPES.EXPONENTIAL_HISTOGRAM:
					setSpaceAggregationOptions(metricsHistogramSpaceAggregateOperatorOptions);
					break;
				default:
					setSpaceAggregationOptions(metricsGaugeSpaceAggregateOperatorOptions);
					break;
			}

			setOperators(newOperators);
		},
		[panelType],
	);

	const handleChangeAggregatorAttribute = useCallback(
		(value: BaseAutocompleteData): void => {
			const newQuery: IBuilderQuery = {
				...query,
				aggregateAttribute: value,
				having: [],
			};

			if (
				newQuery.dataSource === DataSource.METRICS &&
				entityVersion === ENTITY_VERSION_V4
			) {
				handleMetricAggregateAtributeTypes(newQuery.aggregateAttribute);

				if (newQuery.aggregateAttribute.type === ATTRIBUTE_TYPES.SUM) {
					newQuery.aggregateOperator = MetricAggregateOperator.RATE;
					newQuery.timeAggregation = MetricAggregateOperator.RATE;
				} else if (newQuery.aggregateAttribute.type === ATTRIBUTE_TYPES.GAUGE) {
					newQuery.aggregateOperator = MetricAggregateOperator.AVG;
					newQuery.timeAggregation = MetricAggregateOperator.AVG;
				} else {
					newQuery.timeAggregation = '';
				}

				newQuery.spaceAggregation = '';
			}

			handleSetQueryData(index, newQuery);
		},
		[
			query,
			entityVersion,
			handleSetQueryData,
			index,
			handleMetricAggregateAtributeTypes,
		],
	);

	const handleChangeDataSource = useCallback(
		(nextSource: DataSource): void => {
			if (isListViewPanel) {
				if (nextSource === DataSource.LOGS) {
					redirectWithQueryBuilderData(listViewInitialLogQuery);
				} else if (nextSource === DataSource.TRACES) {
					redirectWithQueryBuilderData(listViewInitialTraceQuery);
				}
			}

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
		[
			isListViewPanel,
			panelType,
			query,
			handleSetQueryData,
			index,
			redirectWithQueryBuilderData,
		],
	);

	const handleDeleteQuery = useCallback(() => {
		if (currentQuery.builder.queryData.length > 1) {
			removeQueryBuilderEntityByIndex('queryData', index);
		}
		setLastUsedQuery(0);
	}, [
		currentQuery.builder.queryData.length,
		setLastUsedQuery,
		removeQueryBuilderEntityByIndex,
		index,
	]);

	const handleChangeQueryData: HandleChangeQueryData = useCallback(
		(key, value) => {
			const newQuery: IBuilderQuery = {
				...query,
				[key]:
					key === LEGEND && typeof value === 'string'
						? getFormatedLegend(value)
						: value,
			};

			handleSetQueryData(index, newQuery);
		},
		[query, index, handleSetQueryData],
	);

	const handleChangeFormulaData: HandleChangeFormulaData = useCallback(
		(key, value) => {
			const newFormula: IBuilderFormula = {
				...(formula || ({} as IBuilderFormula)),
				[key]: value,
			};

			handleSetFormulaData(index, newFormula);
		},
		[formula, handleSetFormulaData, index],
	);

	const handleQueryFunctionsUpdates = useCallback(
		(functions: QueryFunctionProps[]): void => {
			const newQuery: IBuilderQuery = {
				...query,
			};

			if (
				newQuery.dataSource === DataSource.METRICS ||
				newQuery.dataSource === DataSource.LOGS
			) {
				newQuery.functions = functions;
			}

			handleSetQueryData(index, newQuery);
		},
		[query, handleSetQueryData, index],
	);

	const isMetricsDataSource = query.dataSource === DataSource.METRICS;
	const isLogsDataSource = query.dataSource === DataSource.LOGS;

	const isTracePanelType = panelType === PANEL_TYPES.TRACE;

	useEffect(() => {
		if (initialDataSource && dataSource !== initialDataSource) return;

		if (
			dataSource === DataSource.METRICS &&
			query &&
			query.aggregateAttribute &&
			entityVersion === ENTITY_VERSION_V4
		) {
			handleMetricAggregateAtributeTypes(query.aggregateAttribute);
		} else {
			const initialOperators = getOperatorsBySourceAndPanelType({
				dataSource,
				panelType: panelType || PANEL_TYPES.TIME_SERIES,
			});

			if (JSON.stringify(operators) === JSON.stringify(initialOperators)) return;

			setOperators(initialOperators);
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dataSource, initialDataSource, panelType, operators, entityVersion]);

	useEffect(() => {
		const additionalFilters = getNewListOfAdditionalFilters(dataSource, true);

		setListOfAdditionalFilters(additionalFilters);
	}, [dataSource, aggregateOperator, getNewListOfAdditionalFilters]);

	useEffect(() => {
		const additionalFilters = getNewListOfAdditionalFilters(dataSource, false);

		setListOfAdditionalFormulaFilters(additionalFilters);
	}, [dataSource, aggregateOperator, getNewListOfAdditionalFilters]);

	return {
		isTracePanelType,
		isMetricsDataSource,
		isLogsDataSource,
		operators,
		spaceAggregationOptions,
		listOfAdditionalFilters,
		handleChangeOperator,
		handleSpaceAggregationChange,
		handleChangeAggregatorAttribute,
		handleChangeDataSource,
		handleDeleteQuery,
		handleChangeQueryData,
		listOfAdditionalFormulaFilters,
		handleChangeFormulaData,
		handleQueryFunctionsUpdates,
	};
};
