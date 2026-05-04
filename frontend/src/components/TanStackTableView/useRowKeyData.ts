import { useCallback, useMemo } from 'react';

export interface RowKeyDataItem {
	/** Final unique key for the row (with dedup suffix if needed) */
	finalKey: string;
	/** Item key for tracking (may differ from finalKey) */
	itemKey: string;
	/** Group metadata when grouped */
	groupMeta: Record<string, string> | undefined;
}

export interface UseRowKeyDataOptions<TData> {
	data: TData[];
	isLoading: boolean;
	getRowKey?: (item: TData) => string;
	getItemKey?: (item: TData) => string;
	groupBy?: Array<{ key: string }>;
	getGroupKey?: (item: TData) => Record<string, string>;
}

export interface UseRowKeyDataResult {
	/** Array of key data for each row, undefined if getRowKey not provided or loading */
	rowKeyData: RowKeyDataItem[] | undefined;
	getRowKeyData: (index: number) => RowKeyDataItem | undefined;
}

/**
 * Computes unique row keys with duplicate handling and group prefixes.
 */
export function useRowKeyData<TData>({
	data,
	isLoading,
	getRowKey,
	getItemKey,
	groupBy,
	getGroupKey,
}: UseRowKeyDataOptions<TData>): UseRowKeyDataResult {
	// eslint-disable-next-line sonarjs/cognitive-complexity
	const rowKeyData = useMemo((): RowKeyDataItem[] | undefined => {
		if (!getRowKey || isLoading) {
			return undefined;
		}

		const keyCount = new Map<string, number>();

		return data.map((item, index): RowKeyDataItem => {
			const itemIdentifier = getRowKey(item);
			const itemKey = getItemKey?.(item) ?? itemIdentifier;
			const groupMeta = groupBy?.length ? getGroupKey?.(item) : undefined;

			// Build rowKey with group prefix when grouped
			let rowKey: string;
			if (groupBy?.length && groupMeta) {
				const groupKeyStr = Object.values(groupMeta).join('-');
				if (groupKeyStr && itemIdentifier) {
					rowKey = `${groupKeyStr}-${itemIdentifier}`;
				} else {
					rowKey = groupKeyStr || itemIdentifier || String(index);
				}
			} else {
				rowKey = itemIdentifier || String(index);
			}

			const count = keyCount.get(rowKey) || 0;
			keyCount.set(rowKey, count + 1);
			const finalKey = count > 0 ? `${rowKey}-${count}` : rowKey;

			return { finalKey, itemKey, groupMeta };
		});
	}, [data, getRowKey, getItemKey, groupBy, getGroupKey, isLoading]);

	const getRowKeyData = useCallback(
		(index: number) => rowKeyData?.[index],
		[rowKeyData],
	);

	return { rowKeyData, getRowKeyData };
}
