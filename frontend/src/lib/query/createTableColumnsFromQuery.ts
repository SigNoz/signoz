import { ColumnsType } from 'antd/es/table';
import { ColumnType } from 'antd/lib/table';
import { FORMULA_REGEXP } from 'constants/regExp';
import { QueryTableProps } from 'container/QueryTable/QueryTable.intefaces';
import { toCapitalize } from 'lib/toCapitalize';
import { ReactNode } from 'react';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryDataV3, SeriesItem } from 'types/api/widgets/getQuery';
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
	data: (string | number)[];
	type: 'field' | 'operator';
	sortable: boolean;
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
	query: Query,
) => { filledDynamicColumns: DynamicColumns; rowsLength: number };

type GetDynamicColumns = (
	queryTableData: QueryDataV3[],
	query: Query,
) => DynamicColumns;

const isFormula = (queryName: string): boolean =>
	FORMULA_REGEXP.test(queryName);

const isColumnExist = (
	columnName: string,
	columns: DynamicColumns,
): boolean => {
	const columnKeys = columns.map((item) => item.key);

	return columnKeys.includes(columnName);
};

const prepareColumnTitle = (title: string): string => {
	const haveUnderscore = title.includes('_');

	if (haveUnderscore) {
		return title
			.split('_')
			.map((str) => toCapitalize(str))
			.join(' ');
	}

	return toCapitalize(title);
};

const getDynamicColumns: GetDynamicColumns = (queryTableData, query) => {
	const dynamicColumns: DynamicColumns = [];

	queryTableData.forEach((currentQuery) => {
		if (!currentQuery.series) return;

		if (!isColumnExist('timestamp', dynamicColumns)) {
			dynamicColumns.push({
				key: 'timestamp',
				data: [],
				type: 'field',
				sortable: true,
			});
		}

		currentQuery.series.forEach((seria) => {
			Object.keys(seria.labels).forEach((label) => {
				if (isColumnExist(label, dynamicColumns)) return;
				if (isFormula(label)) return;

				const labelValue = seria.labels[label];

				const isNumber = !Number.isNaN(parseFloat(labelValue));

				const fieldObj: DynamicColumn = {
					key: label,
					data: [],
					type: 'field',
					sortable: isNumber,
				};

				dynamicColumns.push(fieldObj);
			});
		});

		if (!isFormula(currentQuery.queryName)) {
			const builderQuery = query.builder.queryData.find(
				(q) => q.queryName === currentQuery.queryName,
			);

			const operator = builderQuery ? builderQuery.aggregateOperator : '';

			if (isColumnExist(operator, dynamicColumns)) return;

			const operatorColumn: DynamicColumn = {
				key: operator,
				data: [],
				type: 'operator',
				sortable: true,
			};
			dynamicColumns.push(operatorColumn);
		}
	});

	return dynamicColumns;
};

const getQueryOperator = (
	queryData: IBuilderQuery[],
	currentQueryName: string,
): string => {
	const builderQuery = queryData.find((q) => q.queryName === currentQueryName);

	return builderQuery ? builderQuery.aggregateOperator : '';
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
	currentOperator: string,
): void => {
	const labelEntries = Object.entries(seria.labels);

	seria.values.forEach((value) => {
		const unusedColumnsKeys = new Set<keyof RowData>(
			columns.map((item) => item.key),
		);

		columns.forEach((column) => {
			if (isFormula(column.key as string)) return;

			if (column.key === 'timestamp') {
				column.data.push(value.timestamp);
				unusedColumnsKeys.delete('timestamp');
				return;
			}

			if (column.key === currentOperator) {
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

const fillColumnsData: FillColumnData = (queryTableData, cols, query) => {
	const fields = cols.filter((item) => item.type === 'field');
	const operators = cols.filter((item) => item.type === 'operator');
	const resultColumns = [...fields, ...operators];

	queryTableData.forEach((currentQuery) => {
		if (!currentQuery.series) return;

		const currentOperator = getQueryOperator(
			query.builder.queryData,
			currentQuery.queryName,
		);

		currentQuery.series.forEach((seria) => {
			fillDataFromSeria(seria, resultColumns, currentOperator);
		});
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
			title: prepareColumnTitle(item.key as string),
			sorter: item.sortable
				? (a: RowData, b: RowData): number =>
						(a[item.key] as number) - (b[item.key] as number)
				: false,
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
		query,
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
