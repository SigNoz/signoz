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

	const isInitialized = useRef(false);
	useEffect(() => {
		if (!isInitialized.current && urlExpression) {
			const cleanedExpression = getUserExpressionFromCombined(
				initialExpression,
				urlExpression,
			);
			store.getState().initializeFromUrl(cleanedExpression);
			isInitialized.current = true;
		}
	}, [urlExpression, initialExpression, store]);

	useEffect(() => {
		if (isInitialized.current || !urlExpression) {
			setUrlExpression(committedExpression || null);
		}
	}, [committedExpression, setUrlExpression, urlExpression]);

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
