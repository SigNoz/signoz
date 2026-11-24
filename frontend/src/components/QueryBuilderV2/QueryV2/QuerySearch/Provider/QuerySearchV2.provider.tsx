import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { parseAsString, useQueryState } from 'nuqs';
import { useStore } from 'zustand';

import { getUserExpressionFromCombined } from '../utils';
import { QuerySearchV2Context } from './context';
import type { QuerySearchV2Store } from './QuerySearchV2.store';
import { createExpressionStore } from './QuerySearchV2.store';
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

	// The URL owns the expression. Reads the browser's URL: after a write, nuqs
	// can briefly report the value it replaced.
	const followBrowserUrl = useCallback((): void => {
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
	}, [queryParamKey, initialExpression, store]);

	// Back and Forward.
	useEffect(() => {
		window.addEventListener('popstate', followBrowserUrl);
		return (): void => window.removeEventListener('popstate', followBrowserUrl);
	}, [followBrowserUrl]);

	// Write only when the committed filter changes, never in reply to a URL change.
	// Declared before the effect below, which can reset the filter this render holds.
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

	// Any other navigation. A provider can outlive the navigation away from its
	// page (a route-driven tab keeps the leaving pane mounted until its animation
	// ends), so a param that disappeared is followed, not restored.
	const previousUrlExpression = useRef(urlExpression);
	useEffect(() => {
		if (urlExpression === previousUrlExpression.current) {
			return;
		}
		previousUrlExpression.current = urlExpression;
		const browserValue = new URLSearchParams(window.location.search).get(
			queryParamKey,
		);
		if (urlExpression !== browserValue) {
			return;
		}
		followBrowserUrl();
	}, [urlExpression, queryParamKey, followBrowserUrl]);

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
