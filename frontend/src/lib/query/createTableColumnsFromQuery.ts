import { ColumnsType } from 'antd/es/table';
import { ColumnType } from 'antd/lib/table';
import { FORMULA_REGEXP } from 'constants/regExp';
import { QueryTableProps } from 'container/QueryTable/QueryTable.intefaces';
import { toCapitalize } from 'lib/toCapitalize';
import { ReactNode } from 'react';
import {
	IBuilderFormula,
	IBuilderQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { ListItem, QueryDataV3, SeriesItem } from 'types/api/widgets/getQuery';
import { QueryBuilderData } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

type CreateTableDataFromQueryParams = Pick<
	QueryTableProps,
	'queryTableData' | 'query' | 'renderActionCell'
>;

export type RowData = {
	timestamp: number;
	key: string;
	[key: string]: string | number;
};

type DynamicColumn = {
	key: keyof RowData;
	title: string;
	sourceLabel: string;
	data: (string | number)[];
	type: 'field' | 'operator' | 'formula';
	// sortable: boolean;
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
type SeriesItemLabels = SeriesItem['labels'];

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
	builder: QueryBuilderData,
	currentQueryName: string,
	type: T,
): (T extends 'queryData' ? IBuilderQuery : IBuilderFormula) | null => {
	const queryArray = builder[type];

	const currentQuery =
		queryArray.find((q) => q.queryName === currentQueryName) || null;

	if (!currentQuery) return null;

	return currentQuery as T extends 'queryData' ? IBuilderQuery : IBuilderFormula;
};

const createLabels = <T extends ListItemData | SeriesItemLabels>(
	// labels: T,
	label: keyof T,
	dynamicColumns: DynamicColumns,
): void => {
	if (isValueExist('key', label as string, dynamicColumns)) return;

	// const labelValue = labels[label];

	// const isNumber = !Number.isNaN(parseFloat(String(labelValue)));

	const fieldObj: DynamicColumn = {
		key: label as string,
		title: label as string,
		sourceLabel: label as string,
		data: [],
		type: 'field',
		// sortable: isNumber,
	};

	dynamicColumns.push(fieldObj);
};

const appendOperatorFormulaColumns = (
	builder: QueryBuilderData,
	currentQueryName: string,
	dynamicColumns: DynamicColumns,
): void => {
	const currentFormula = getQueryByName(
		builder,
		currentQueryName,
		'queryFormulas',
	);
	if (currentFormula) {
		let formulaLabel = `${currentFormula.queryName}(${currentFormula.expression})`;

		if (currentFormula.legend) {
			formulaLabel += ` - ${currentFormula.legend}`;
		}

		const formulaColumn: DynamicColumn = {
			key: currentQueryName,
			title: formulaLabel,
			sourceLabel: formulaLabel,
			data: [],
			type: 'formula',
			// sortable: isNumber,
		};

		dynamicColumns.push(formulaColumn);
	}

	const currentQueryData = getQueryByName(
		builder,
		currentQueryName,
		'queryData',
	);

	if (!currentQueryData) return;

	let operatorLabel = `${currentQueryData.aggregateOperator}`;
	if (currentQueryData.aggregateAttribute.key) {
		operatorLabel += `(${currentQueryData.aggregateAttribute.key})`;
	}

	if (currentQueryData.legend) {
		operatorLabel += ` - ${currentQueryData.legend}`;
	} else {
		operatorLabel += ` - ${currentQueryData.queryName}`;
	}

	const resultValue = `${toCapitalize(operatorLabel)}`;

	const operatorColumn: DynamicColumn = {
		key: currentQueryName,
		title: resultValue,
		sourceLabel: resultValue,
		data: [],
		type: 'operator',
		// sortable: isNumber,
	};

	dynamicColumns.push(operatorColumn);
};

const getDynamicColumns: GetDynamicColumns = (queryTableData, query) => {
	const dynamicColumns: DynamicColumns = [];

	queryTableData.forEach((currentQuery) => {
		if (currentQuery.list) {
			currentQuery.list.forEach((listItem) => {
				Object.keys(listItem.data).forEach((label) => {
					createLabels<ListItemData>(label as ListItemKey, dynamicColumns);
				});
			});
		}

		if (currentQuery.series) {
			if (!isValueExist('key', 'timestamp', dynamicColumns)) {
				dynamicColumns.push({
					key: 'timestamp',
					title: 'Timestamp',
					sourceLabel: 'Timestamp',
					data: [],
					type: 'field',
					// sortable: true,
				});
			}

			appendOperatorFormulaColumns(
				query.builder,
				currentQuery.queryName,
				dynamicColumns,
			);

			currentQuery.series.forEach((seria) => {
				Object.keys(seria.labels).forEach((label) => {
					createLabels<SeriesItemLabels>(label, dynamicColumns);
				});
			});
		}
	});

	return dynamicColumns.map((item) => {
		if (isFormula(item.key as string)) {
			return item;
		}

		const sameValues = dynamicColumns.filter(
			(column) => column.sourceLabel === item.sourceLabel,
		);

		if (sameValues.length > 1) {
			return { ...item, title: `${item.title} - ${item.key}` };
		}

		return item;
	});
};

const fillEmptyRowCells = (
	unusedColumnsKeys: Set<keyof RowData>,
	sourceColumns: DynamicColumns,
	currentColumn: DynamicColumn,
): void => {
	unusedColumnsKeys.forEach((key) => {
		if (key === currentColumn.key) {
			const unusedCol = sourceColumns.find((item) => item.key === key);

			if (unusedCol) {
				unusedCol.data.push('N/A');
				unusedColumnsKeys.delete(key);
			}
		}
	});
};

const fillDataFromSeria = (
	seria: SeriesItem,
	columns: DynamicColumns,
	queryName: string,
): void => {
	const labelEntries = Object.entries(seria.labels);

	seria.values.forEach((value) => {
		const unusedColumnsKeys = new Set<keyof RowData>(
			columns.map((item) => item.key),
		);

		columns.forEach((column) => {
			if (column.key === 'timestamp') {
				column.data.push(value.timestamp);
				unusedColumnsKeys.delete('timestamp');
				return;
			}

			if (queryName === column.key) {
				column.data.push(parseFloat(value.value).toFixed(2));
				unusedColumnsKeys.delete(column.key);
				return;
			}

			labelEntries.forEach(([key, currentValue]) => {
				if (column.key === key) {
					column.data.push(currentValue);
					unusedColumnsKeys.delete(key);
				}
			});

			fillEmptyRowCells(unusedColumnsKeys, columns, column);
		});
	});
};

const fillDataFromList = (
	listItem: ListItem,
	columns: DynamicColumns,
): void => {
	columns.forEach((column) => {
		if (isFormula(column.key as string)) return;

		Object.keys(listItem.data).forEach((label) => {
			if (column.key === label) {
				if (listItem.data[label as ListItemKey] !== '') {
					column.data.push(listItem.data[label as ListItemKey].toString());
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

	queryTableData.forEach((currentQuery) => {
		if (currentQuery.series) {
			currentQuery.series.forEach((seria) => {
				fillDataFromSeria(seria, resultColumns, currentQuery.queryName);
			});
		}

		if (currentQuery.list) {
			currentQuery.list.forEach((listItem) => {
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
			const { key } = item;

			acc[key] = item.data[i];
			acc.key = uuid();

			return acc;
		}, {} as RowData);

		data.push(rowData);
	}

	return data;
};

const generateTableColumns = (
	dynamicColumns: DynamicColumns,
): ColumnsType<RowData> => {
	const columns: ColumnsType<RowData> = dynamicColumns.reduce<
		ColumnsType<RowData>
	>((acc, item) => {
		const column: ColumnType<RowData> = {
			dataIndex: item.key,
			key: item.key,
			title: item.title,
			// sorter: item.sortable
			// 	? (a: RowData, b: RowData): number =>
			// 			(a[item.key] as number) - (b[item.key] as number)
			// 	: false,
		};

		return [...acc, column];
	}, []);

	return columns;
};

export const createTableColumnsFromQuery: CreateTableDataFromQuery = ({
	query,
	queryTableData,
	renderActionCell,
}) => {
	const dynamicColumns = getDynamicColumns(queryTableData, query);

	const { filledDynamicColumns, rowsLength } = fillColumnsData(
		queryTableData,
		dynamicColumns,
	);

	const dataSource = generateData(filledDynamicColumns, rowsLength);

	const columns = generateTableColumns(filledDynamicColumns);

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
