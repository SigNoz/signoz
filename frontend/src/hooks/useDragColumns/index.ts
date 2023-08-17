import { ColumnsType } from 'antd/es/table';
import getFromLocalstorage from 'api/browser/localstorage/get';
import setToLocalstorage from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { useCallback, useEffect, useMemo } from 'react';

import { COLUMNS } from './configs';
import { UseDragColumns } from './types';

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

	const redirectWithNewDraggedColumns = useCallback(
		async (localStorageColumns: string) => {
			let nextDraggedColumns: ColumnsType<T> = [];

			try {
				const parsedDraggedColumns = await JSON.parse(localStorageColumns);
				nextDraggedColumns = parsedDraggedColumns;
			} catch (e) {
				console.log('error while parsing json');
			} finally {
				redirectWithDraggedColumns(nextDraggedColumns);
			}
		},
		[redirectWithDraggedColumns],
	);

	useEffect(() => {
		if (draggedColumnsQuery || !localStorageDraggedColumns) return;

		redirectWithNewDraggedColumns(localStorageDraggedColumns);
	}, [
		draggedColumnsQuery,
		localStorageDraggedColumns,
		redirectWithNewDraggedColumns,
	]);

	return {
		draggedColumns,
		onDragColumns,
	};
};

export default useDragColumns;
