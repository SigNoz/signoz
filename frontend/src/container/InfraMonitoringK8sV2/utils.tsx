import { useCallback, useEffect, useMemo, useState } from 'react';
import get from 'api/browser/localstorage/get';
import set from 'api/browser/localstorage/set';

import { DEFAULT_PAGE_SIZE } from './constants';

export interface IEntityColumn {
	label: string;
	value: string;
	id: string;
	canRemove: boolean;
}
/**
 * Custom hook to manage the page size for a table.
 * The page size is stored in local storage and is retrieved on initialization.
 * It also provides a function to update the page size and save it to local storage.
 */
export const usePageSize = (
	key: string,
): { pageSize: number; setPageSize: (pageSize: number) => void } => {
	const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

	// Memoized key for accessing page size in local storage
	const storageKey = useMemo(() => `k8s-${key}-page-size`, [key]);

	useEffect(() => {
		// Retrieve the stored page size from local storage on component mount
		const storageValue = get(storageKey);
		if (storageValue) {
			setPageSize(parseInt(storageValue, 10));
		}
	}, [storageKey]);

	// Function to update the page size and save it to local storage
	const handlePageSizeChange = useCallback(
		(value: number) => {
			setPageSize(value);
			set(storageKey, value.toString());
		},
		[storageKey],
	);

	return {
		pageSize,
		setPageSize: handlePageSizeChange,
	};
};
