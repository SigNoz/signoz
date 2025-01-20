import { ColumnsType } from 'antd/es/table';
import { ColumnType } from 'antd/lib/table';
import {
	initialClickHouseData,
	initialFormulaBuilderFormValues,
	initialQueryBuilderFormValues,
	initialQueryPromQLData,
} from 'constants/queryBuilder';
import { FORMULA_REGEXP } from 'constants/regExp';
import { QUERY_TABLE_CONFIG } from 'container/QueryTable/config';
import { QueryTableProps } from 'container/QueryTable/QueryTable.intefaces';
import { get, isEqual, isNaN, isObject } from 'lodash-es';
import { ReactNode } from 'react';
import {
	IBuilderFormula,
	IBuilderQuery,
	IClickHouseQuery,
	IPromQLQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { ListItem, QueryDataV3, SeriesItem } from 'types/api/widgets/getQuery';
import { EQueryType } from 'types/common/dashboard';
import { QueryBuilderData } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

type CreateTableDataFromQueryParams = Pick<
	QueryTableProps,
	'queryTableData' | 'query' | 'renderActionCell' | 'renderColumnCell'
>;

export type RowData = {
	timestamp: number;
	key: string;
	[key: string]: string | number;
};

export type DynamicColumn = {
	query: IBuilderQuery | IBuilderFormula | IClickHouseQuery | IPromQLQuery;
	field: string;
	dataIndex: string;
	title: string;
	data: (string | number)[];
	type: 'field' | 'operator' | 'formula';
};

type DynamicColumns = DynamicColumn[];

type CreateTableDataFromQuery = (
	params: CreateTableDataFromQueryParams,
) => {
	columns: ColumnsType<RowData>;
	dataSource: RowData[];
	rowsLength: number;
};

type FillColumnData = (
	queryTableData: QueryDataV3[],
	dynamicColumns: DynamicColumns,
) => { filledDynamicColumns: DynamicColumns; rowsLength: number };

type GetDynamicColumns = (
	queryTableData: QueryDataV3[],
	query: Query,
) => DynamicColumns;

type ListItemData = ListItem['data'];
type ListItemKey = keyof ListItemData;

const isFormula = (queryName: string): boolean =>
	FORMULA_REGEXP.test(queryName);

const isValueExist = (
	field: keyof DynamicColumn,
	value: string,
	columns: DynamicColumns,
): boolean => {
	const existColumns = columns.find((item) => item[field] === value);

	return !!existColumns;
};

const getQueryByName = <T extends keyof QueryBuilderData>(
	query: Query,
	currentQueryName: string,
	type: T,
): IBuilderQuery | IBuilderFormula | IClickHouseQuery | IPromQLQuery => {
	if (query.queryType === EQueryType.CLICKHOUSE) {
		const queryArray = query.clickhouse_sql;
		const defaultQueryValue = initialClickHouseData;

		return (
			queryArray.find((q) => q.name === currentQueryName) || defaultQueryValue
		);
	}
	if (query.queryType === EQueryType.QUERY_BUILDER) {
		const queryArray = query.builder[type];
		const defaultValue =
			type === 'queryData'
				? initialQueryBuilderFormValues
				: initialFormulaBuilderFormValues;

		const currentQuery =
			queryArray.find((q) => q.queryName === currentQueryName) || defaultValue;

		return currentQuery as T extends 'queryData'
			? IBuilderQuery
			: IBuilderFormula;
	}

	const queryArray = query.promql;
	const defaultQueryValue = initialQueryPromQLData;

	return (
		queryArray.find((q) => q.name === currentQueryName) || defaultQueryValue
	);
};

const addLabels = (
	query: IBuilderQuery | IBuilderFormula | IClickHouseQuery | IPromQLQuery,
	label: string,
	dynamicColumns: DynamicColumns,
): void => {
	if (isValueExist('dataIndex', label, dynamicColumns)) return;

	const fieldObj: DynamicColumn = {
		query,
		field: label as string,
		dataIndex: label,
		title: label,
		data: [],
		type: 'field',
	};

	dynamicColumns.push(fieldObj);
};

const addOperatorFormulaColumns = (
	query: IBuilderFormula | IBuilderQuery | IClickHouseQuery | IPromQLQuery,
	dynamicColumns: DynamicColumns,
	queryType: EQueryType,
	customLabel?: string,
	// eslint-disable-next-line sonarjs/cognitive-complexity
): void => {
	if (isFormula(get(query, 'queryName', ''))) {
		const formulaQuery = query as IBuilderFormula;
		let formulaLabel = `${formulaQuery.queryName}(${formulaQuery.expression})`;

		if (formulaQuery.legend) {
			formulaLabel = formulaQuery.legend;
		}

		const formulaColumn: DynamicColumn = {
			query,
			field: formulaQuery.queryName,
			dataIndex: formulaQuery.queryName,
			title: customLabel || formulaLabel,
			data: [],
			type: 'formula',
		};

		dynamicColumns.push(formulaColumn);

		return;
	}

	if (queryType === EQueryType.QUERY_BUILDER) {
		const currentQueryData = query as IBuilderQuery;
		let operatorLabel = `${currentQueryData.aggregateOperator}`;
		if (currentQueryData.aggregateAttribute.key) {
			operatorLabel += `(${currentQueryData.aggregateAttribute.key})`;
		}

		if (currentQueryData.legend) {
			operatorLabel = currentQueryData.legend;
		}

		const operatorColumn: DynamicColumn = {
			query,
			field: currentQueryData.queryName,
			dataIndex: currentQueryData.queryName,
			title: customLabel || operatorLabel,
			data: [],
			type: 'operator',
		};

		dynamicColumns.push(operatorColumn);
	}

	if (queryType === EQueryType.CLICKHOUSE) {
		const currentQueryData = query as IClickHouseQuery;
		let operatorLabel = `${currentQueryData.name}`;

		if (currentQueryData.legend) {
			operatorLabel = currentQueryData.legend;
		}

		const operatorColumn: DynamicColumn = {
			query,
			field: currentQueryData.name,
			dataIndex: currentQueryData.name,
			title: customLabel || operatorLabel,
			data: [],
			type: 'operator',
		};

		dynamicColumns.push(operatorColumn);
	}

	if (queryType === EQueryType.PROM) {
		const currentQueryData = query as IPromQLQuery;
		let operatorLabel = `${currentQueryData.name}`;

		if (currentQueryData.legend) {
			operatorLabel = currentQueryData.legend;
		}

		const operatorColumn: DynamicColumn = {
			query,
			field: currentQueryData.name,
			dataIndex: currentQueryData.name,
			title: customLabel || operatorLabel,
			data: [],
			type: 'operator',
		};

		dynamicColumns.push(operatorColumn);
	}
};

const transformColumnTitles = (
	dynamicColumns: DynamicColumns,
): DynamicColumns =>
	dynamicColumns.map((item) => {
		if (isFormula(item.field as string)) {
			return item;
		}

		const sameValues = dynamicColumns.filter(
			(column) => column.title === item.title,
		);

		if (sameValues.length > 1) {
			return {
				...item,
				dataIndex: `${item.title} - ${get(
					item.query,
					'queryName',
					get(item.query, 'name', ''),
				)}`,
				title: `${item.title} - ${get(
					item.query,
					'queryName',
					get(item.query, 'name', ''),
				)}`,
			};
		}

		return item;
	});

const getDynamicColumns: GetDynamicColumns = (queryTableData, query) => {
	const dynamicColumns: DynamicColumns = [];

	queryTableData.forEach((currentQuery) => {
		const { series, queryName, list } = currentQuery;

		const currentStagedQuery = getQueryByName(
			query,
			queryName,
			isFormula(queryName) ? 'queryFormulas' : 'queryData',
		);
		if (list) {
			list.forEach((listItem) => {
				Object.keys(listItem.data).forEach((label) => {
					addLabels(currentStagedQuery, label, dynamicColumns);
				});
			});
		}

		if (series) {
			const isValuesColumnExist = series.some((item) => item.values.length > 0);
			const isEveryValuesExist = series.every((item) => item.values.length > 0);

			if (isValuesColumnExist) {
				addOperatorFormulaColumns(
					currentStagedQuery,
					dynamicColumns,
					query.queryType,
					isEveryValuesExist ? undefined : get(currentStagedQuery, 'queryName', ''),
				);
			}

			series.forEach((seria) => {
				seria.labelsArray?.forEach((lab) => {
					Object.keys(lab).forEach((label) => {
						if (label === currentQuery?.queryName) return;

						addLabels(currentStagedQuery, label, dynamicColumns);
					});
				});
			});
		}
	});

	return transformColumnTitles(dynamicColumns);
};

const fillEmptyRowCells = (
	unusedColumnsKeys: Set<keyof RowData>,
	sourceColumns: DynamicColumns,
	currentColumn: DynamicColumn,
): void => {
	unusedColumnsKeys.forEach((key) => {
		if (key === currentColumn.field) {
			const unusedCol = sourceColumns.find((item) => item.field === key);

			if (unusedCol) {
				unusedCol.data.push('N/A');
				unusedColumnsKeys.delete(key);
			}
		}
	});
};

const findSeriaValueFromAnotherQuery = (
	currentLabels: Record<string, string>,
	nextQuery: QueryDataV3 | null,
): SeriesItem | null => {
	if (!nextQuery || !nextQuery.series) return null;

	let value = null;

	const labelEntries = Object.entries(currentLabels);

	nextQuery.series.forEach((seria) => {
		const localLabelEntries = Object.entries(seria.labels);
		if (localLabelEntries.length !== labelEntries.length) return;

		const isExistLabels = isEqual(localLabelEntries, labelEntries);

		if (isExistLabels) {
			value = seria;
		}
	});

	return value;
};

const isEqualQueriesByLabel = (
	equalQueries: string[],
	queryName: string,
): boolean => equalQueries.includes(queryName);

const fillAggregationData = (
	column: DynamicColumn,
	value: string,
	unusedColumnsKeys: Set<keyof RowData>,
): void => {
	column.data.push(parseFloat(value).toFixed(2));
	unusedColumnsKeys.delete(column.field);
};

const fillRestAggregationData = (
	column: DynamicColumn,
	queryTableData: QueryDataV3[],
	seria: SeriesItem,
	equalQueriesByLabels: string[],
	isEqualQuery: boolean,
): void => {
	const nextQueryData =
		queryTableData.find((q) => q.queryName === column.field) || null;

	const targetSeria = findSeriaValueFromAnotherQuery(
		seria.labels,
		nextQueryData,
	);

	const isEqual = isEqualQueriesByLabel(equalQueriesByLabels, column.field);
	if (targetSeria) {
		if (!isEqual) {
			// This line is crucial. It ensures that no additional rows are added to the table for similar labels across all formulas here is how this check is applied: signoz/frontend/src/lib/query/createTableColumnsFromQuery.ts line number 370
			equalQueriesByLabels.push(column.field);
		}
	} else if (!isEqualQuery) {
		column.data.push('N/A');
	}
};

const fillLabelsData = (
	column: DynamicColumn,
	seria: SeriesItem,
	unusedColumnsKeys: Set<keyof RowData>,
): void => {
	const labelEntries = Object.entries(seria.labels);

	labelEntries.forEach(([key, currentValue]) => {
		if (column.field === key) {
			column.data.push(currentValue);
			unusedColumnsKeys.delete(key);
		}
	});
};

const fillDataFromSeries = (
	currentQuery: QueryDataV3,
	queryTableData: QueryDataV3[],
	columns: DynamicColumns,
	equalQueriesByLabels: string[],
): void => {
	const { series, queryName } = currentQuery;
	const isEqualQuery = isEqualQueriesByLabel(equalQueriesByLabels, queryName);

	if (!series) return;

	series.forEach((seria) => {
		const unusedColumnsKeys = new Set<keyof RowData>(
			columns.map((item) => item.field),
		);

		columns.forEach((column) => {
			if (queryName === column.field) {
				if (seria.values.length === 0) return;

				fillAggregationData(
					column,
					parseFloat(seria.values[0].value).toFixed(2),
					unusedColumnsKeys,
				);
				return;
			}

			if (column.type !== 'field' && column.field !== queryName) {
				// This code is executed only when there are multiple formulas. It checks if there are similar labels present in other formulas and, if found, adds them to the corresponding column data in the table.
				fillRestAggregationData(
					column,
					queryTableData,
					seria,
					equalQueriesByLabels,
					isEqualQuery,
				);

				return;
			}

			if (isEqualQuery) return;

			fillLabelsData(column, seria, unusedColumnsKeys);

			fillEmptyRowCells(unusedColumnsKeys, columns, column);
		});
	});
};

const fillDataFromList = (
	listItem: ListItem,
	columns: DynamicColumns,
): void => {
	columns.forEach((column) => {
		if (isFormula(column.field)) return;

		Object.keys(listItem.data).forEach((label) => {
			if (column.dataIndex === label) {
				if (listItem.data[label as ListItemKey] !== '') {
					if (isObject(listItem.data[label as ListItemKey])) {
						column.data.push(JSON.stringify(listItem.data[label as ListItemKey]));
					} else {
						column.data.push(listItem.data[label as ListItemKey].toString());
					}
				} else {
					column.data.push('N/A');
				}
			}
		});
	});
};

const fillColumnsData: FillColumnData = (queryTableData, cols) => {
	const fields = cols.filter((item) => item.type === 'field');
	const operators = cols.filter((item) => item.type === 'operator');
	const formulas = cols.filter((item) => item.type === 'formula');
	const resultColumns = [...fields, ...operators, ...formulas];

	const equalQueriesByLabels: string[] = [];

	queryTableData.forEach((currentQuery) => {
		const { list } = currentQuery;

		fillDataFromSeries(
			currentQuery,
			queryTableData,
			resultColumns,
			equalQueriesByLabels,
		);

		if (list) {
			list.forEach((listItem) => {
				fillDataFromList(listItem, resultColumns);
			});
		}
	});

	const rowsLength = resultColumns.length > 0 ? resultColumns[0].data.length : 0;

	return { filledDynamicColumns: resultColumns, rowsLength };
};

const generateData = (
	dynamicColumns: DynamicColumns,
	rowsLength: number,
): RowData[] => {
	const data: RowData[] = [];

	for (let i = 0; i < rowsLength; i += 1) {
		const rowData: RowData = dynamicColumns.reduce((acc, item) => {
			const { dataIndex } = item;

			acc[dataIndex] = item.data[i];
			acc.key = uuid();

			return acc;
		}, {} as RowData);

		data.push(rowData);
	}

	return data;
};

const generateTableColumns = (
	dynamicColumns: DynamicColumns,
	renderColumnCell?: QueryTableProps['renderColumnCell'],
): ColumnsType<RowData> => {
	const columns: ColumnsType<RowData> = dynamicColumns.reduce<
		ColumnsType<RowData>
	>((acc, item) => {
		const column: ColumnType<RowData> = {
			dataIndex: item.dataIndex,
			title: item.title,
			width: QUERY_TABLE_CONFIG.width,
			render: renderColumnCell && renderColumnCell[item.dataIndex],
			sorter: (a: RowData, b: RowData): number => {
				const valueA = Number(
					a[`${item.dataIndex}_without_unit`] ?? a[item.dataIndex],
				);
				const valueB = Number(
					b[`${item.dataIndex}_without_unit`] ?? b[item.dataIndex],
				);

				if (!isNaN(valueA) && !isNaN(valueB)) {
					return valueA - valueB;
				}

				return ((a[item.dataIndex] as string) || '').localeCompare(
					(b[item.dataIndex] as string) || '',
				);
			},
		};

		return [...acc, column];
	}, []);

	return columns;
};

export const createTableColumnsFromQuery: CreateTableDataFromQuery = ({
	query,
	queryTableData,
	renderActionCell,
	renderColumnCell,
}) => {
	const sortedQueryTableData = queryTableData.sort((a, b) =>
		a.queryName < b.queryName ? -1 : 1,
	);

	const dynamicColumns = getDynamicColumns(sortedQueryTableData, query);

	const { filledDynamicColumns, rowsLength } = fillColumnsData(
		sortedQueryTableData,
		dynamicColumns,
	);

	const dataSource = generateData(filledDynamicColumns, rowsLength);

	const columns = generateTableColumns(filledDynamicColumns, renderColumnCell);

	const actionsCell: ColumnType<RowData> | null = renderActionCell
		? {
				key: 'actions',
				title: 'Actions',
				render: (_, record): ReactNode => renderActionCell(record),
		  }
		: null;

	if (actionsCell && dataSource.length > 0) {
		columns.push(actionsCell);
	}

	return { columns, dataSource, rowsLength };
};
