import { ColumnsType } from 'antd/es/table';
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

export function getTableColumn<T>(columnData: ColumnsType<T>): ColumnsType<T> {
	return columnData.map(({ title, key }) => ({
		title,
		dataIndex: key,
		key,
		align: key === 'id' ? 'right' : 'left',
		render: (record: Record): JSX.Element => (
			<TableComponents columnKey={String(title)} record={record} />
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
