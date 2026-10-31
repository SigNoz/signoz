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

	const adoptedUrlExpression = useRef<string | null | undefined>(undefined);
	// The URL owns the expression, in both directions. A provider can outlive the
	// navigation away from the page it belongs to (a route-driven tab keeps the
	// leaving pane mounted until its animation ends), so treating a param that
	// disappeared as something to restore republishes it onto the URL of the page
	// being entered.
	useEffect(() => {
		const previousUrlExpression = adoptedUrlExpression.current;
		adoptedUrlExpression.current = urlExpression;
		// Only a URL change is adopted: a new initial expression arrives with
		// whatever a child ran for it, which the URL has not caught up with yet.
		if (urlExpression === previousUrlExpression) {
			return;
		}
		// On mount an empty URL has nothing to adopt, and children run their mount
		// effects first: an expression one of them ran is already committed.
		if (previousUrlExpression === undefined && !urlExpression) {
			return;
		}

		const userExpression = getUserExpressionFromCombined(
			initialExpression,
			urlExpression,
		);
		if (userExpression !== store.getState().committedExpression) {
			store.getState().initializeFromUrl(userExpression);
		}
	}, [urlExpression, initialExpression, store]);

	const publishedExpression = useRef(committedExpression);
	useEffect(() => {
		if (committedExpression === publishedExpression.current) {
			return;
		}
		publishedExpression.current = committedExpression;
		setUrlExpression(committedExpression || null);
	}, [committedExpression, setUrlExpression]);

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
