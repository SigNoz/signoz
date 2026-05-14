// eslint-disable-next-line no-restricted-imports -- React Context required for scoped store pattern
import { createContext, useCallback, useContext } from 'react';
import { StoreApi, useStore } from 'zustand';

import {
	combineInitialAndUserExpression,
	getUserExpressionFromCombined,
} from '../utils';
import type { QuerySearchV2Store } from './QuerySearchV2.store';

export const QuerySearchV2Context =
	createContext<StoreApi<QuerySearchV2Store> | null>(null);

function useQuerySearchV2Store(): StoreApi<QuerySearchV2Store> {
	const store = useContext(QuerySearchV2Context);
	if (!store) {
		throw new Error(
			'useQuerySearchV2Store must be used within a QuerySearchV2Provider',
		);
	}
	return store;
}

export function useInitialExpression(): string {
	const store = useQuerySearchV2Store();
	return useStore(store, (s) => s.initialExpression);
}

export function useInputExpression(): string {
	const store = useQuerySearchV2Store();
	return useStore(store, (s) => s.inputExpression);
}

export function useUserExpression(): string {
	const store = useQuerySearchV2Store();
	return useStore(store, (s) => s.committedExpression);
}

export function useExpression(): string {
	const store = useQuerySearchV2Store();
	return useStore(store, (s) =>
		combineInitialAndUserExpression(s.initialExpression, s.committedExpression),
	);
}

export function useQuerySearchOnChange(): (expression: string) => void {
	const store = useQuerySearchV2Store();

	return useCallback(
		(expression: string): void => {
			const userOnly = getUserExpressionFromCombined(
				store.getState().initialExpression,
				expression,
			);
			store.getState().setInputExpression(userOnly);
		},
		[store],
	);
}

export function useQuerySearchOnRun(): (expression: string) => void {
	const store = useQuerySearchV2Store();
	const initialExpression = useStore(store, (s) => s.initialExpression);

	return useCallback(
		(expression: string): void => {
			const userOnly = getUserExpressionFromCombined(
				initialExpression,
				expression,
			);
			store.getState().commitExpression(userOnly);
		},
		[store, initialExpression],
	);
}

export function useQuerySearchInitialExpressionProp(): string | undefined {
	const initialExpression = useInitialExpression();
	return initialExpression.trim() ? initialExpression : undefined;
}
