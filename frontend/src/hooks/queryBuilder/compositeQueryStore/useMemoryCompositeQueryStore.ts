import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { migrateCompositeQuery } from 'lib/compositeQuery/migrateCompositeQuery';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { CommitCompositeQueryOptions, CompositeQueryStore } from './types';

export interface UseMemoryCompositeQueryStoreProps {
	initialQuery?: Query;
	initialPanelType?: PANEL_TYPES;
	onCommit?: (query: Query) => void;
}

/**
 * CompositeQueryStore backed by React state — the staged query never
 * touches the URL. The seed query goes through the same legacy-format
 * migration as URL parsing, so hosts can pass queries loaded from saved
 * sources (alert rules, dashboard specs) as is. The store lives and dies
 * with the provider that mounts it.
 */
export const useMemoryCompositeQueryStore = ({
	initialQuery,
	initialPanelType,
	onCommit,
}: UseMemoryCompositeQueryStoreProps): CompositeQueryStore => {
	const [query, setQuery] = useState<Query | null>(() =>
		initialQuery ? migrateCompositeQuery(initialQuery) : null,
	);
	const [panelType] = useState<PANEL_TYPES | null>(initialPanelType ?? null);

	const onCommitRef = useRef(onCommit);
	useEffect(() => {
		onCommitRef.current = onCommit;
	}, [onCommit]);

	const commit = useCallback(
		(committedQuery: Query, options?: CommitCompositeQueryOptions): void => {
			if (
				process.env.NODE_ENV !== 'production' &&
				options &&
				(options.redirectingUrl || options.searchParams || options.newTab)
			) {
				// eslint-disable-next-line no-console
				console.warn(
					'[QueryBuilder] memory mode ignores URL commit options:',
					options,
				);
			}

			setQuery(committedQuery);
			onCommitRef.current?.(committedQuery);
		},
		[],
	);

	return useMemo(
		() => ({ mode: 'memory', query, panelType, commit }),
		[query, panelType, commit],
	);
};
