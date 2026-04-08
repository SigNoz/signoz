import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { ColumnSizingState } from '@tanstack/react-table';
import getFromLocalstorage from 'api/browser/localstorage/get';
import setToLocalstorage from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';

import { OrderedColumn, PersistedColumnSizing } from './types';
import { getColumnId } from './utils';

const COLUMN_SIZING_PERSIST_DEBOUNCE_MS = 250;

const sanitizeSizing = (input: unknown): ColumnSizingState => {
	if (!input || typeof input !== 'object') {
		return {};
	}
	return Object.entries(
		input as Record<string, unknown>,
	).reduce<ColumnSizingState>((acc, [key, value]) => {
		if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
			return acc;
		}
		acc[key] = value;
		return acc;
	}, {});
};

const readPersistedColumnSizing = (): ColumnSizingState => {
	const rawSizing = getFromLocalstorage(LOCALSTORAGE.LOGS_LIST_COLUMN_SIZING);
	if (!rawSizing) {
		return {};
	}

	try {
		const parsed = JSON.parse(rawSizing) as
			| PersistedColumnSizing
			| ColumnSizingState;
		const sizing = ('sizing' in parsed
			? parsed.sizing
			: parsed) as ColumnSizingState;
		return sanitizeSizing(sizing);
	} catch (error) {
		console.error('Failed to parse persisted log column sizing', error);
		return {};
	}
};

type UseColumnSizingPersistenceResult = {
	columnSizing: ColumnSizingState;
	setColumnSizing: Dispatch<SetStateAction<ColumnSizingState>>;
};

export const useColumnSizingPersistence = (
	orderedColumns: OrderedColumn[],
): UseColumnSizingPersistenceResult => {
	const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() =>
		readPersistedColumnSizing(),
	);
	const orderedColumnIds = useMemo(
		() => orderedColumns.map((column) => getColumnId(column)),
		[orderedColumns],
	);

	useEffect(() => {
		if (orderedColumnIds.length === 0) {
			return;
		}

		const validColumnIds = new Set(orderedColumnIds);
		const nonResizableColumnIds = new Set(
			orderedColumns
				.filter(
					(column) => column.key === 'expand' || column.key === 'state-indicator',
				)
				.map((column) => getColumnId(column)),
		);

		setColumnSizing((previousSizing) => {
			const nextSizing = Object.entries(previousSizing).reduce<ColumnSizingState>(
				(acc, [columnId, size]) => {
					if (!validColumnIds.has(columnId) || nonResizableColumnIds.has(columnId)) {
						return acc;
					}
					acc[columnId] = size;
					return acc;
				},
				{},
			);
			const hasChanged =
				Object.keys(nextSizing).length !== Object.keys(previousSizing).length ||
				Object.entries(nextSizing).some(
					([columnId, size]) => previousSizing[columnId] !== size,
				);

			return hasChanged ? nextSizing : previousSizing;
		});
	}, [orderedColumnIds, orderedColumns]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			const persistedSizing = { sizing: columnSizing };
			setToLocalstorage(
				LOCALSTORAGE.LOGS_LIST_COLUMN_SIZING,
				JSON.stringify(persistedSizing),
			);
		}, COLUMN_SIZING_PERSIST_DEBOUNCE_MS);

		return (): void => window.clearTimeout(timeoutId);
	}, [columnSizing]);

	return { columnSizing, setColumnSizing };
};
