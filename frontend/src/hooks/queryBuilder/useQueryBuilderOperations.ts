/* eslint-disable sonarjs/cognitive-complexity */
import { ENTITY_VERSION_V4, ENTITY_VERSION_V5 } from 'constants/app';
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
	metricsUnknownSpaceAggregateOperatorOptions,
	metricsUnknownTimeAggregateOperatorOptions,
} from 'constants/queryBuilderOperators';
import {
	listViewInitialLogQuery,
	listViewInitialTraceQuery,
} from 'container/NewDashboard/ComponentsSlider/constants';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { getMetricsOperatorsByAttributeType } from 'lib/newQueryBuilder/getMetricsOperatorsByAttributeType';
import { getOperatorsBySourceAndPanelType } from 'lib/newQueryBuilder/getOperatorsBySourceAndPanelType';
import { findDataTypeOfOperator } from 'lib/query/findDataTypeOfOperator';
import { isEmpty, isEqual } from 'lodash-es';
import { useCallback, useEffect, useState } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderFormula,
	IBuilderQuery,
} from 'types/api/queryBuilder/queryBuilderData';
import {
	MetricAggregation,
	QueryFunction,
	SpaceAggregation,
	TimeAggregation,
} from 'types/api/v5/queryRange';
import {
	HandleChangeFormulaData,
	HandleChangeQueryData,
	HandleChangeQueryDataV5,
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
	isForTraceOperator = false,
}) => {
	const {
		handleSetQueryData,
		handleSetTraceOperatorData,
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

	const [previousMetricInfo, setPreviousMetricInfo] = useState<{
		name: string;
		type: string;
	} | null>(null);

	useEffect(() => {
		if (query) {
			const metricName =
				query.aggregateAttribute?.key ||
				(query.aggregations?.[0] as MetricAggregation)?.metricName;
			const metricType = query.aggregateAttribute?.type;
			if (metricName && metricType) {
				setPreviousMetricInfo({
					name: metricName,
					type: metricType,
				});
			} else {
				setPreviousMetricInfo(null);
			}
		}
	}, [query]);

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
				query.aggregateAttribute?.dataType;

			const typeOfValue = findDataTypeOfOperator(value);

			const shouldResetAggregateAttribute =
				(aggregateDataType === 'string' || aggregateDataType === 'bool') &&
				typeOfValue === 'number';

			// since this is only relevant for metrics, we can use the first aggregation
			const metricAggregation = query.aggregations?.[0] as MetricAggregation;

			const newQuery: IBuilderQuery = {
				...query,
				aggregateOperator: value,
				timeAggregation: value,
				aggregations: [
					{
						...metricAggregation,
						timeAggregation: value as TimeAggregation,
					},
				],
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
				aggregations: [
					{
						...query.aggregations?.[0],
						spaceAggregation: value as SpaceAggregation,
						metricName: (query.aggregations?.[0] as MetricAggregation).metricName,
						temporality: (query.aggregations?.[0] as MetricAggregation).temporality,
						timeAggregation: (query.aggregations?.[0] as MetricAggregation)
							.timeAggregation,
					},
				],
			};

			handleSetQueryData(index, newQuery);
		},
		[index, query, handleSetQueryData],
	);

	const handleMetricAggregateAtributeTypes = useCallback(
		(aggregateAttribute: BaseAutocompleteData): any => {
			// operators for unknown metric
			const isUnknownMetric =
				isEmpty(aggregateAttribute?.type) && !isEmpty(aggregateAttribute?.key);

			const newOperators = isUnknownMetric
				? metricsUnknownTimeAggregateOperatorOptions
				: getMetricsOperatorsByAttributeType({
						dataSource: DataSource.METRICS,
						panelType: panelType || PANEL_TYPES.TIME_SERIES,
						aggregateAttributeType:
							(aggregateAttribute?.type as ATTRIBUTE_TYPES) || ATTRIBUTE_TYPES.GAUGE,
				  });

			switch (aggregateAttribute?.type) {
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
					setSpaceAggregationOptions(metricsUnknownSpaceAggregateOperatorOptions);
					break;
			}

			setOperators(newOperators);
		},
		[panelType],
	);

	const handleChangeAggregatorAttribute = useCallback(
		(
			value: BaseAutocompleteData,
			isEditMode?: boolean,
			attributeKeys?: BaseAutocompleteData[],
		): void => {
			const newQuery: IBuilderQuery = {
				...query,
				aggregateAttribute: value,
			};

			const getAttributeKeyFromMetricName = (metricName: string): string =>
				attributeKeys?.find((key) => key.key === metricName)?.type || '';

			if (
				newQuery.dataSource === DataSource.METRICS &&
				entityVersion === ENTITY_VERSION_V4
			) {
				if (newQuery.aggregateAttribute) {
					handleMetricAggregateAtributeTypes(newQuery.aggregateAttribute);
				}

				if (!isEditMode) {
					if (newQuery.aggregateAttribute?.type === ATTRIBUTE_TYPES.SUM) {
						newQuery.aggregateOperator = MetricAggregateOperator.RATE;
						newQuery.timeAggregation = MetricAggregateOperator.RATE;
					} else if (newQuery.aggregateAttribute?.type === ATTRIBUTE_TYPES.GAUGE) {
						newQuery.aggregateOperator = MetricAggregateOperator.AVG;
						newQuery.timeAggregation = MetricAggregateOperator.AVG;
					} else {
						newQuery.timeAggregation = '';
					}

					newQuery.spaceAggregation = '';

					// Handled query with unknown metric to avoid 400 and 500 errors
					// With metric value typed and not available then - time - 'avg', space - 'avg'
					// If not typed - time - 'rate', space - 'sum', op - 'count'
					if (isEmpty(newQuery.aggregateAttribute?.type)) {
						if (!isEmpty(newQuery.aggregateAttribute?.key)) {
							newQuery.aggregateOperator = MetricAggregateOperator.AVG;
							newQuery.timeAggregation = MetricAggregateOperator.AVG;
							newQuery.spaceAggregation = MetricAggregateOperator.AVG;
						} else {
							newQuery.aggregateOperator = MetricAggregateOperator.COUNT;
							newQuery.timeAggregation = MetricAggregateOperator.RATE;
							newQuery.spaceAggregation = MetricAggregateOperator.SUM;
						}
					}
				}
			}

			if (
				newQuery.dataSource === DataSource.METRICS &&
				entityVersion === ENTITY_VERSION_V5
			) {
				if (newQuery.aggregateAttribute) {
					handleMetricAggregateAtributeTypes(newQuery.aggregateAttribute);
				}

				if (!isEditMode) {
					// Get current metric info
					const currentMetricType = newQuery.aggregateAttribute?.type || '';

					const prevMetricType = previousMetricInfo?.type
						? previousMetricInfo.type
						: getAttributeKeyFromMetricName(previousMetricInfo?.name || '');

					// Check if metric type has changed by comparing with tracked previous values
					const metricTypeChanged =
						!prevMetricType || !currentMetricType
							? false
							: prevMetricType !== currentMetricType;

					// Only reset operators if metric type has changed or if this is the first metric selection
					if (metricTypeChanged || !previousMetricInfo) {
						if (newQuery.aggregateAttribute?.type === ATTRIBUTE_TYPES.SUM) {
							newQuery.aggregations = [
								{
									timeAggregation: MetricAggregateOperator.RATE,
									metricName: newQuery.aggregateAttribute?.key || '',
									temporality: '',
									spaceAggregation: '',
								},
							];
						} else if (newQuery.aggregateAttribute?.type === ATTRIBUTE_TYPES.GAUGE) {
							newQuery.aggregations = [
								{
									timeAggregation: MetricAggregateOperator.AVG,
									metricName: newQuery.aggregateAttribute?.key || '',
									temporality: '',
									spaceAggregation: '',
								},
							];
						} else {
							newQuery.aggregations = [
								{
									timeAggregation: '',
									metricName: newQuery.aggregateAttribute?.key || '',
									temporality: '',
									spaceAggregation: '',
								},
							];
						}

						newQuery.aggregateOperator = '';
						newQuery.spaceAggregation = '';

						// Handled query with unknown metric to avoid 400 and 500 errors
						// With metric value typed and not available then - time - 'avg', space - 'avg'
						// If not typed - time - 'rate', space - 'sum', op - 'count'
						if (isEmpty(newQuery.aggregateAttribute?.type)) {
							if (!isEmpty(newQuery.aggregateAttribute?.key)) {
								newQuery.aggregations = [
									{
										timeAggregation: MetricAggregateOperator.AVG,
										metricName: newQuery.aggregateAttribute?.key || '',
										temporality: '',
										spaceAggregation: MetricAggregateOperator.AVG,
									},
								];
							} else {
								newQuery.aggregations = [
									{
										timeAggregation: MetricAggregateOperator.COUNT,
										metricName: newQuery.aggregateAttribute?.key || '',
										temporality: '',
										spaceAggregation: MetricAggregateOperator.SUM,
									},
								];
							}
						}
					} else {
						// If metric type hasn't changed, preserve existing aggregations but update metric name
						const currentAggregation = query.aggregations?.[0] as MetricAggregation;
						if (currentAggregation) {
							newQuery.aggregations = [
								{
									...currentAggregation,
									metricName: newQuery.aggregateAttribute?.key || '',
								},
							];
						}
					}
				}
			}

			handleSetQueryData(index, newQuery);
		},
		[
			query,
			entityVersion,
			handleSetQueryData,
			index,
			handleMetricAggregateAtributeTypes,
			previousMetricInfo,
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
				initialQueryBuilderFormValuesMap[nextSource],
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

	const handleChangeQueryData:
		| HandleChangeQueryData
		| HandleChangeQueryDataV5 = useCallback(
		(key: string, value: any) => {
			const newQuery = {
				...query,
				[key]:
					key === LEGEND && typeof value === 'string'
						? getFormatedLegend(value)
						: value,
			};

			if (isForTraceOperator) {
				handleSetTraceOperatorData(index, newQuery);
			} else {
				handleSetQueryData(index, newQuery);
			}
		},
		[
			query,
			index,
			handleSetQueryData,
			handleSetTraceOperatorData,
			isForTraceOperator,
		],
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
		(functions: QueryFunction[]): void => {
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

			if (
				!operators ||
				operators.length === 0 ||
				!isEqual(operators, initialOperators)
			) {
				setOperators(initialOperators);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		dataSource,
		initialDataSource,
		panelType,
		entityVersion,
		query,
		handleMetricAggregateAtributeTypes,
	]);

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
