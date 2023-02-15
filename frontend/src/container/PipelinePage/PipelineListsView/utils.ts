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
