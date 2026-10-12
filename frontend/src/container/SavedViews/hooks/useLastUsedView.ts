import { useCallback } from 'react';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { LOCALSTORAGE } from 'constants/localStorage';
import {
	PreservedViewsInLocalStorage,
	PreservedViewType,
} from 'container/ExplorerOptions/types';

import { UseLastUsedViewResult } from '../types';

function readLastUsedViews(): PreservedViewsInLocalStorage {
	try {
		return JSON.parse(
			getLocalStorageKey(LOCALSTORAGE.LAST_USED_SAVED_VIEWS) || '{}',
		) as PreservedViewsInLocalStorage;
	} catch {
		return {};
	}
}

// Read at call time, not held in state: the hook is used from more than one
// place and a cached copy would bring back a view another caller just cleared.
export function useLastUsedView(
	savedViewSource: SavedviewtypesSourceDTO,
): UseLastUsedViewResult {
	// The bar's enum carries the same four values as the v2 source.
	const source = savedViewSource as unknown as PreservedViewType;

	const getLastUsedViewKey = useCallback(
		(): string | undefined => readLastUsedViews()[source]?.key,
		[source],
	);

	const setLastUsedView = useCallback(
		(id: string, displayName: string): void => {
			setLocalStorageKey(
				LOCALSTORAGE.LAST_USED_SAVED_VIEWS,
				JSON.stringify({
					...readLastUsedViews(),
					[source]: { key: id, value: displayName },
				}),
			);
		},
		[source],
	);

	const clearLastUsedView = useCallback((): void => {
		const { [source]: _removed, ...rest } = readLastUsedViews();
		setLocalStorageKey(LOCALSTORAGE.LAST_USED_SAVED_VIEWS, JSON.stringify(rest));
	}, [source]);

	return { getLastUsedViewKey, setLastUsedView, clearLastUsedView };
}
