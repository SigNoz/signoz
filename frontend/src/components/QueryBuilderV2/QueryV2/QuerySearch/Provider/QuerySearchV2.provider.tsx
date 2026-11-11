import { ReactNode, useEffect, useRef } from 'react';
import { parseAsString, useQueryState } from 'nuqs';
import { useStore } from 'zustand';

import { getUserExpressionFromCombined } from '../utils';
import { QuerySearchV2Context } from './context';
import {
	createExpressionStore,
	QuerySearchV2Store,
} from './QuerySearchV2.store';
import type { StoreApi } from 'zustand';

export interface QuerySearchV2ProviderProps {
	queryParamKey: string;
	initialExpression?: string;
	/**
	 * @default false
	 */
	persistOnUnmount?: boolean;
	children: ReactNode;
}

/**
 * Provider component that creates a scoped zustand store and exposes
 * the store via context. Handles URL synchronization.
 */
export function QuerySearchV2Provider({
	initialExpression = '',
	persistOnUnmount = false,
	queryParamKey,
	children,
}: QuerySearchV2ProviderProps): JSX.Element {
	const storeRef = useRef<StoreApi<QuerySearchV2Store> | null>(null);
	if (!storeRef.current) {
		storeRef.current = createExpressionStore();
	}
	const store = storeRef.current;

	const [urlExpression, setUrlExpression] = useQueryState(
		queryParamKey,
		parseAsString,
	);

	const committedExpression = useStore(store, (s) => s.committedExpression);

	useEffect(() => {
		store.getState().setInitialExpression(initialExpression);
	}, [initialExpression, store]);

	// What this provider last wrote, so its own write coming back is not taken
	// for a change from outside (Back, Forward, a link). Undefined until mount.
	const lastWrittenRef = useRef<string | null | undefined>(undefined);
	useEffect(() => {
		const isMount = lastWrittenRef.current === undefined;
		if (urlExpression === lastWrittenRef.current) {
			return;
		}
		lastWrittenRef.current = urlExpression;
		if (urlExpression) {
			store
				.getState()
				.initializeFromUrl(
					getUserExpressionFromCombined(initialExpression, urlExpression),
				);
		} else if (!isMount) {
			store.getState().resetExpression();
		}
	}, [urlExpression, initialExpression, store]);

	// Write only when the committed filter changes, never in reply to a URL change.
	const lastCommittedRef = useRef(committedExpression);
	useEffect(() => {
		if (committedExpression === lastCommittedRef.current) {
			return;
		}
		lastCommittedRef.current = committedExpression;
		const next = committedExpression || null;
		if (next === urlExpression) {
			return;
		}
		lastWrittenRef.current = next;
		void setUrlExpression(next);
	}, [committedExpression, urlExpression, setUrlExpression]);

	useEffect(() => {
		return (): void => {
			if (!persistOnUnmount) {
				setUrlExpression(null);
				store.getState().resetExpression();
			}
		};
	}, [persistOnUnmount, setUrlExpression, store]);

	return (
		<QuerySearchV2Context.Provider value={store}>
			{children}
		</QuerySearchV2Context.Provider>
	);
}
