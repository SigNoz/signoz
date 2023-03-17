import { ColumnType } from 'antd/lib/table/interface';
import dayjs from 'dayjs';
import React from 'react';
import update from 'react-addons-update';

import TableComponents, { Record } from './TableComponents';

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
	return columnData.map(({ title, key, dataIndex, ellipsis }) => ({
		title,
		dataIndex,
		key,
		align: key === 'id' ? 'right' : 'left',
		ellipsis,
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
					.format('MMMM DD, YYYY hh:mm A')
					.includes(searchValue)
			: String(data[key]).toLowerCase().includes(searchValue.toLowerCase()),
	);
}
