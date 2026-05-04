import { ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { parseAsString, useQueryState } from 'nuqs';
import { useStore } from 'zustand';

import {
	combineInitialAndUserExpression,
	getUserExpressionFromCombined,
} from '../utils';
import { QuerySearchV2Context } from './context';
import type { QuerySearchV2ContextValue } from './QuerySearchV2.store';
import { createExpressionStore } from './QuerySearchV2.store';

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
 * expression state to children via context.
 */
export function QuerySearchV2Provider({
	initialExpression = '',
	persistOnUnmount = false,
	queryParamKey,
	children,
}: QuerySearchV2ProviderProps): JSX.Element {
	const storeRef = useRef(createExpressionStore());
	const store = storeRef.current;

	const [urlExpression, setUrlExpression] = useQueryState(
		queryParamKey,
		parseAsString,
	);

	const committedExpression = useStore(store, (s) => s.committedExpression);
	const setInputExpression = useStore(store, (s) => s.setInputExpression);
	const commitExpression = useStore(store, (s) => s.commitExpression);
	const initializeFromUrl = useStore(store, (s) => s.initializeFromUrl);
	const resetExpression = useStore(store, (s) => s.resetExpression);

	const isInitialized = useRef(false);
	useEffect(() => {
		if (!isInitialized.current && urlExpression) {
			const cleanedExpression = getUserExpressionFromCombined(
				initialExpression,
				urlExpression,
			);
			initializeFromUrl(cleanedExpression);
			isInitialized.current = true;
		}
	}, [urlExpression, initialExpression, initializeFromUrl]);

	useEffect(() => {
		if (isInitialized.current || !urlExpression) {
			setUrlExpression(committedExpression || null);
		}
	}, [committedExpression, setUrlExpression, urlExpression]);

	useEffect(() => {
		return (): void => {
			if (!persistOnUnmount) {
				setUrlExpression(null);
				resetExpression();
			}
		};
	}, [persistOnUnmount, setUrlExpression, resetExpression]);

	const handleChange = useCallback(
		(expression: string): void => {
			const userOnly = getUserExpressionFromCombined(
				initialExpression,
				expression,
			);
			setInputExpression(userOnly);
		},
		[initialExpression, setInputExpression],
	);

	const handleRun = useCallback(
		(expression: string): void => {
			const userOnly = getUserExpressionFromCombined(
				initialExpression,
				expression,
			);
			commitExpression(userOnly);
		},
		[initialExpression, commitExpression],
	);

	const combinedExpression = useMemo(
		() => combineInitialAndUserExpression(initialExpression, committedExpression),
		[initialExpression, committedExpression],
	);

	const contextValue = useMemo<QuerySearchV2ContextValue>(
		() => ({
			expression: combinedExpression,
			userExpression: committedExpression,
			initialExpression,
			querySearchProps: {
				initialExpression: initialExpression.trim() ? initialExpression : undefined,
				onChange: handleChange,
				onRun: handleRun,
			},
		}),
		[
			combinedExpression,
			committedExpression,
			initialExpression,
			handleChange,
			handleRun,
		],
	);

	return (
		<QuerySearchV2Context.Provider value={contextValue}>
			{children}
		</QuerySearchV2Context.Provider>
	);
}
