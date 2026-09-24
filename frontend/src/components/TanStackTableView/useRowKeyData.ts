import { useCallback, useMemo } from 'react';

export interface RowKeyDataItem<TItemKey = string> {
	/** Final unique key for the row (with dedup suffix if needed) */
	finalKey: string;
	/** Item key for tracking (may differ from finalKey) */
	itemKey: TItemKey;
	/** Group metadata when grouped */
	groupMeta: Record<string, string> | undefined;
}

export interface UseRowKeyDataOptions<TData, TItemKey = string> {
	data: TData[];
	isLoading: boolean;
	getRowKey?: (item: TData) => string;
	getItemKey?: (item: TData) => TItemKey;
	groupBy?: Array<{ key: string }>;
	getGroupKey?: (item: TData) => Record<string, string>;
}

export interface UseRowKeyDataResult<TItemKey = string> {
	/** Array of key data for each row, undefined if getRowKey not provided or loading */
	rowKeyData: RowKeyDataItem<TItemKey>[] | undefined;
	getRowKeyData: (index: number) => RowKeyDataItem<TItemKey> | undefined;
}

/**
 * Computes unique row keys with duplicate handling and group prefixes.
 */
export function useRowKeyData<TData, TItemKey = string>({
	data,
	isLoading,
	getRowKey,
	getItemKey,
	groupBy,
	getGroupKey,
}: UseRowKeyDataOptions<TData, TItemKey>): UseRowKeyDataResult<TItemKey> {
	// eslint-disable-next-line sonarjs/cognitive-complexity
	const rowKeyData = useMemo((): RowKeyDataItem<TItemKey>[] | undefined => {
		if (!getRowKey || isLoading) {
			return undefined;
		}

		const keyCount = new Map<string, number>();

		return data.map((item, index): RowKeyDataItem<TItemKey> => {
			const itemIdentifier = getRowKey(item);
			const itemKey = getItemKey?.(item) ?? (itemIdentifier as TItemKey);
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
