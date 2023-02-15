import update from 'react-addons-update';

export function getElementFromArray<T>(
	arr: Array<T>,
	target: T,
	key: keyof T,
): Array<T> {
	return arr.filter((data) => data[key] !== target[key]);
}

export function getRecordIndex<T>(
	arr: Array<T>,
	target: T,
	key: keyof T,
): number {
	return arr.findIndex((item) => item[key] === target[key]);
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
