import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';

import { DynamicColumnsKey } from './contants';
import {
	GetNewColumnDataFunction,
	GetVisibleColumnsFunction,
	SetVisibleColumnsProps,
} from './types';

export const getVisibleColumns: GetVisibleColumnsFunction = ({
	tablesource,
	dynamicColumns,
	columnsData,
}) => {
	let columnVisibilityData: { [key: string]: boolean };
	try {
		const storedData = getLocalStorageKey(tablesource);
		if (typeof storedData === 'string' && dynamicColumns) {
			columnVisibilityData = JSON.parse(storedData);
			return dynamicColumns.filter((column) => {
				if (column.key && !columnsData?.find((c) => c.key === column.key)) {
					return columnVisibilityData[column.key];
				}
				return false;
			});
		}

		const initialColumnVisibility: Record<string, boolean> = {};
		Object.values(DynamicColumnsKey).forEach((key) => {
			initialColumnVisibility[key] = false;
		});

		setLocalStorageKey(tablesource, JSON.stringify(initialColumnVisibility));
	} catch (error) {
		console.error(error);
	}
	return [];
};

export const setVisibleColumns = ({
	checked,
	index,
	tablesource,
	dynamicColumns,
}: SetVisibleColumnsProps): void => {
	try {
		const storedData = getLocalStorageKey(tablesource);
		if (typeof storedData === 'string' && dynamicColumns) {
			const columnVisibilityData = JSON.parse(storedData);
			const { key } = dynamicColumns[index];
			if (key) {
				columnVisibilityData[key] = checked;
			}
			setLocalStorageKey(tablesource, JSON.stringify(columnVisibilityData));
		}
	} catch (error) {
		console.error(error);
	}
};

export const getNewColumnData: GetNewColumnDataFunction = ({
	prevColumns,
	checked,
	dynamicColumns,
	index,
}) => {
	if (checked && dynamicColumns) {
		return prevColumns
			? [
					...prevColumns.slice(0, prevColumns.length - 1),
					dynamicColumns[index],
					prevColumns[prevColumns.length - 1],
			  ]
			: undefined;
	}
	return prevColumns && dynamicColumns
		? prevColumns.filter((column) => dynamicColumns[index].title !== column.title)
		: undefined;
};
