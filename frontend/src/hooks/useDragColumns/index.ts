import { ColumnsType } from 'antd/es/table';
import getFromLocalstorage from 'api/browser/localstorage/get';
import setToLocalstorage from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { useCallback, useEffect, useMemo } from 'react';

import { COLUMNS } from './configs';

const useDragColumns = <T>(storageKey: LOCALSTORAGE): UseDragColumns<T> => {
	const {
		query: draggedColumnsQuery,
		queryData: draggedColumns,
		redirectWithQuery: redirectWithDraggedColumns,
	} = useUrlQueryData<ColumnsType<T>>(COLUMNS, []);

	const localStorageDraggedColumns = useMemo(
		() => getFromLocalstorage(storageKey),
		[storageKey],
	);

	const handleRedirectWithDraggedColumns = useCallback(
		(columns: ColumnsType<T>) => {
			redirectWithDraggedColumns(columns);

			setToLocalstorage(storageKey, JSON.stringify(columns));
		},
		[storageKey, redirectWithDraggedColumns],
	);

	const onDragColumns = useCallback(
		(columns: ColumnsType<T>, fromIndex: number, toIndex: number): void => {
			const columnsData = [...columns];
			const item = columnsData.splice(fromIndex, 1)[0];
			columnsData.splice(toIndex, 0, item);

			handleRedirectWithDraggedColumns(columnsData);
		},
		[handleRedirectWithDraggedColumns],
	);

	useEffect(() => {
		if (draggedColumnsQuery) return;

		const nextDraggedColumns = localStorageDraggedColumns
			? JSON.parse(localStorageDraggedColumns)
			: [];

		redirectWithDraggedColumns(nextDraggedColumns);
	}, [
		draggedColumnsQuery,
		localStorageDraggedColumns,
		redirectWithDraggedColumns,
	]);

	return {
		draggedColumns,
		onDragColumns,
	};
};

type UseDragColumns<T> = {
	draggedColumns: ColumnsType<T>;
	onDragColumns: (
		columns: ColumnsType<T>,
		fromIndex: number,
		toIndex: number,
	) => void;
};

export default useDragColumns;
