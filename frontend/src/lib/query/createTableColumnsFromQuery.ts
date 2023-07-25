import { ColumnsType } from 'antd/es/table';
import { ColumnType } from 'antd/lib/table';
import {
	initialFormulaBuilderFormValues,
	initialQueryBuilderFormValues,
} from 'constants/queryBuilder';
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
	'queryTableData' | 'query' | 'renderActionCell' | 'renderColumnCell'
>;

export type RowData = {
	timestamp: number;
	key: string;
	[key: string]: string | number;
};

type DynamicColumn = {
	query: IBuilderQuery | IBuilderFormula;
	field: string;
	dataIndex: string;
	title: string;
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
): T extends 'queryData' ? IBuilderQuery : IBuilderFormula => {
	const queryArray = builder[type];
	const defaultValue =
		type === 'queryData'
			? initialQueryBuilderFormValues
			: initialFormulaBuilderFormValues;

	const currentQuery =
		queryArray.find((q) => q.queryName === currentQueryName) || defaultValue;

	return currentQuery as T extends 'queryData' ? IBuilderQuery : IBuilderFormula;
};

const addListLabels = (
	query: IBuilderQuery | IBuilderFormula,
	label: ListItemKey,
	dynamicColumns: DynamicColumns,
): void => {
	if (isValueExist('dataIndex', label, dynamicColumns)) return;

	const fieldObj: DynamicColumn = {
		query,
		field: 'label',
		dataIndex: label as string,
		title: label as string,
		data: [],
		type: 'field',
		// sortable: isNumber,
	};

	dynamicColumns.push(fieldObj);
};

const addSeriaLabels = (
	label: string,
	dynamicColumns: DynamicColumns,
	query: IBuilderQuery | IBuilderFormula,
): void => {
	if (isValueExist('dataIndex', label, dynamicColumns)) return;

	// const labelValue = labels[label];

	// const isNumber = !Number.isNaN(parseFloat(String(labelValue)));

	const fieldObj: DynamicColumn = {
		query,
		field: label as string,
		dataIndex: label,
		title: label,
		data: [],
		type: 'field',
		// sortable: isNumber,
	};

	dynamicColumns.push(fieldObj);
};

const addOperatorFormulaColumns = (
	query: IBuilderFormula | IBuilderQuery,
	dynamicColumns: DynamicColumns,
	customLabel?: string,
): void => {
	if (isFormula(query.queryName)) {
		const formulaQuery = query as IBuilderFormula;
		let formulaLabel = `${formulaQuery.queryName}(${formulaQuery.expression})`;

		if (formulaQuery.legend) {
			formulaLabel += ` - ${formulaQuery.legend}`;
		}

		const formulaColumn: DynamicColumn = {
			query,
			field: formulaQuery.queryName,
			dataIndex: formulaQuery.queryName,
			title: customLabel || formulaLabel,
			data: [],
			type: 'formula',
			// sortable: isNumber,
		};

		dynamicColumns.push(formulaColumn);

		return;
	}

	const currentQueryData = query as IBuilderQuery;

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
		query,
		field: currentQueryData.queryName,
		dataIndex: currentQueryData.queryName,
		title: customLabel || resultValue,
		data: [],
		type: 'operator',
		// sortable: isNumber,
	};

	dynamicColumns.push(operatorColumn);
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
				dataIndex: `${item.title} - ${item.query.queryName}`,
				title: `${item.title} - ${item.query.queryName}`,
			};
		}

		return item;
	});

const getDynamicColumns: GetDynamicColumns = (queryTableData, query) => {
	const dynamicColumns: DynamicColumns = [];

	queryTableData.forEach((currentQuery) => {
		const currentStagedQuery = getQueryByName(
			query.builder,
			currentQuery.queryName,
			isFormula(currentQuery.queryName) ? 'queryFormulas' : 'queryData',
		);
		if (currentQuery.list) {
			currentQuery.list.forEach((listItem) => {
				Object.keys(listItem.data).forEach((label) => {
					addListLabels(currentStagedQuery, label as ListItemKey, dynamicColumns);
				});
			});
		}

		if (currentQuery.series) {
			const isValuesColumnExist = currentQuery.series.some(
				(item) => item.values.length > 0,
			);
			const isEveryValuesExist = currentQuery.series.every(
				(item) => item.values.length > 0,
			);

			if (isValuesColumnExist) {
				addOperatorFormulaColumns(
					currentStagedQuery,
					dynamicColumns,
					isEveryValuesExist ? undefined : currentStagedQuery.queryName,
				);
			}

			currentQuery.series.forEach((seria) => {
				Object.keys(seria.labels).forEach((label) => {
					if (label === currentQuery?.queryName) return;

					addSeriaLabels(label as string, dynamicColumns, currentStagedQuery);
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

const fillData = (
	seria: SeriesItem,
	columns: DynamicColumns,
	queryName: string,
	value?: SeriesItem['values'][number],
): void => {
	const labelEntries = Object.entries(seria.labels);

	const unusedColumnsKeys = new Set<keyof RowData>(
		columns.map((item) => item.field),
	);

	columns.forEach((column) => {
		if (queryName === column.field && value) {
			column.data.push(parseFloat(value.value).toFixed(2));
			unusedColumnsKeys.delete(column.field);
			return;
		}

		labelEntries.forEach(([key, currentValue]) => {
			if (column.field === key) {
				column.data.push(currentValue);
				unusedColumnsKeys.delete(key);
			}
		});

		fillEmptyRowCells(unusedColumnsKeys, columns, column);
	});
};

const fillDataFromSeria = (
	seria: SeriesItem,
	columns: DynamicColumns,
	queryName: string,
): void => {
	if (seria.values.length === 0) {
		fillData(seria, columns, queryName);

		return;
	}

	seria.values.forEach((value) => {
		fillData(seria, columns, queryName, value);
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
			render: renderColumnCell && renderColumnCell[item.dataIndex],
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
	renderColumnCell,
}) => {
	const dynamicColumns = getDynamicColumns(queryTableData, query);

	const { filledDynamicColumns, rowsLength } = fillColumnsData(
		queryTableData,
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
