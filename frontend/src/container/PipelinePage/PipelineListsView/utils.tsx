import { ColumnType } from 'antd/lib/table/interface';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import update from 'react-addons-update';
import { ProcessorData } from 'types/api/pipeline/def';

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
	const data = processorData;
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
