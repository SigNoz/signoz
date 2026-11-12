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
	const lastCommittedRef = useRef(committedExpression);
	useEffect(() => {
		if (isInitialized.current || !urlExpression) {
			return;
		}
		isInitialized.current = true;
		store
			.getState()
			.initializeFromUrl(
				getUserExpressionFromCombined(initialExpression, urlExpression),
			);
	}, [urlExpression, initialExpression, store]);

	// Back and Forward. Reads the browser's URL: after a write, nuqs can briefly
	// report the value it replaced.
	useEffect(() => {
		const onPopState = (): void => {
			isInitialized.current = true;
			const urlValue = new URLSearchParams(window.location.search).get(
				queryParamKey,
			);
			const expression = urlValue
				? getUserExpressionFromCombined(initialExpression, urlValue)
				: '';
			// Another param changed; keep any text typed but not run.
			if (expression === store.getState().committedExpression) {
				return;
			}
			// Already in the URL, so the write below must not run for it.
			lastCommittedRef.current = expression;
			if (expression) {
				store.getState().initializeFromUrl(expression);
			} else {
				store.getState().resetExpression();
			}
		};
		window.addEventListener('popstate', onPopState);
		return (): void => window.removeEventListener('popstate', onPopState);
	}, [queryParamKey, initialExpression, store]);

	// Write only when the committed filter changes, never in reply to a URL change.
	useEffect(() => {
		if (committedExpression === lastCommittedRef.current) {
			return;
		}
		lastCommittedRef.current = committedExpression;
		isInitialized.current = true;
		const next = committedExpression || null;
		if (next === urlExpression) {
			return;
		}
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
