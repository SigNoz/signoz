import update from 'react-addons-update';
import { TableColumnType as ColumnType } from 'antd';
import { DEPRECATED_OPERATORS } from 'constants/antlrQueryConstants';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import { cloneDeep } from 'lodash-es';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { ProcessorData } from 'types/api/pipeline/def';

import TableComponents, { Record } from './TableComponents';

function toCanonicalFilterOperator(op: string): string {
	const normalized = op.trim();
	if (!normalized) {
		return normalized;
	}

	const lower = normalized.toLowerCase();

	// Deprecated → canonical (UI/operator-picker format)
	switch (lower) {
		case DEPRECATED_OPERATORS.NIN:
			return 'not in';
		case DEPRECATED_OPERATORS.NREGEX:
			return 'not regex';
		case DEPRECATED_OPERATORS.NLIKE:
			return 'not like';
		case DEPRECATED_OPERATORS.NILIKE:
			return 'not ilike';
		case DEPRECATED_OPERATORS.NEXTISTS:
			return 'not exists';
		case DEPRECATED_OPERATORS.NCONTAINS:
			return 'not contains';
		case DEPRECATED_OPERATORS.NHAS:
			return 'not has';
		case DEPRECATED_OPERATORS.NHASANY:
			return 'not hasAny';
		case DEPRECATED_OPERATORS.NHASALL:
			return 'not hasAll';
		case DEPRECATED_OPERATORS.REGEX:
			return 'regex';
		default:
			return normalized;
	}
}

export function mapTagFilterToCanonicalOperators(filter: TagFilter): TagFilter {
	if (!filter?.items?.length) {
		return filter;
	}

	let changed = false;
	const items = filter.items.map((item) => {
		const nextOp = toCanonicalFilterOperator(item.op || '');
		if (nextOp !== item.op) {
			changed = true;
			return { ...item, op: nextOp };
		}
		return item;
	});

	return changed ? { ...filter, items } : filter;
}

function toDeprecatedFilterOperator(op: string): string {
	const normalized = op.trim();
	if (!normalized) {
		return normalized;
	}

	const lower = normalized.toLowerCase();

	// Canonical → deprecated (only where a deprecated token exists)
	switch (lower) {
		case 'not in':
			return DEPRECATED_OPERATORS.NIN;
		case 'not regex':
			return DEPRECATED_OPERATORS.NREGEX;
		case 'not like':
			return DEPRECATED_OPERATORS.NLIKE;
		case 'not ilike':
			return DEPRECATED_OPERATORS.NILIKE;
		case 'not exists':
			return DEPRECATED_OPERATORS.NEXTISTS;
		case 'not contains':
			return DEPRECATED_OPERATORS.NCONTAINS;
		case 'not has':
			return DEPRECATED_OPERATORS.NHAS;
		case 'not hasany':
			return DEPRECATED_OPERATORS.NHASANY;
		case 'not hasall':
			return DEPRECATED_OPERATORS.NHASALL;
		case 'regex':
			return DEPRECATED_OPERATORS.REGEX;
		default:
			return normalized;
	}
}

export function mapTagFilterToDeprecatedOperators(
	filter: TagFilter,
): TagFilter {
	if (!filter?.items?.length) {
		return filter;
	}

	let changed = false;
	const items = filter.items.map((item) => {
		const nextOp = toDeprecatedFilterOperator(item.op || '');
		if (nextOp !== item.op) {
			changed = true;
			return { ...item, op: nextOp };
		}
		return item;
	});

	return changed ? { ...filter, items } : filter;
}

export function getElementFromArray<T>(
	arr: Array<T>,
	target: T,
	key: keyof T,
): Array<T> {
	return arr.filter((data) => data[key] !== target?.[key]);
}

export function getRecordIndex<T>(
	arr: Array<T>,
	target: T,
	key: keyof T,
): number {
	return arr?.findIndex((item) => item[key] === target?.[key]);
}

export function getUpdatedRow<T>(
	data: Array<T>,
	dragIndex: number,
	hoverIndex: number,
): Array<T> {
	return update(data, {
		$splice: [
			[dragIndex, 1],
			[hoverIndex, 0, data[dragIndex]],
		],
	});
}

export function getTableColumn<T>(
	columnData: Array<ColumnType<T>>,
): Array<ColumnType<T>> {
	return columnData.map(({ title, key, dataIndex, ellipsis, width }) => ({
		title,
		dataIndex,
		key,
		align: key === 'id' ? 'right' : 'left',
		ellipsis,
		width,
		render: (record: Record): JSX.Element => (
			<TableComponents columnKey={String(key)} record={record} />
		),
	}));
}

export function getEditedDataSource<T>(
	arr: Array<T>,
	target: T,
	key: keyof T,
	editedArr: T,
): Array<T> {
	return arr?.map((data) => (data[key] === target?.[key] ? editedArr : data));
}

export function getDataOnSearch(
	data: {
		[key: string]: never;
	},
	searchValue: string,
): boolean {
	return Object.keys(data).some((key) =>
		key === 'createdAt'
			? dayjs(data[key])
					.locale('en')
					.format(DATE_TIME_FORMATS.MONTH_DATETIME_FULL)
					.includes(searchValue)
			: String(data[key]).toLowerCase().includes(searchValue.toLowerCase()),
	);
}

export function getProcessorUpdatedRow<T extends ProcessorData>(
	processorData: Array<T>,
	dragIndex: number,
	hoverIndex: number,
): Array<T> {
	const data = cloneDeep(processorData);
	const item = data.splice(dragIndex, 1)[0];
	data.splice(hoverIndex, 0, item);
	data.forEach((item, index) => {
		const obj = item;
		obj.orderId = index + 1;
	});
	for (let i = 0; i < data.length - 1; i += 1) {
		data[i].output = data[i + 1].id;
	}
	delete data[data.length - 1].output;
	return data;
}
