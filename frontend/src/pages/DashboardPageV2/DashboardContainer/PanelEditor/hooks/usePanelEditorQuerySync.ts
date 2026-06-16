import { useCallback, useEffect, useMemo, useRef } from 'react';
import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { getIsQueryModified } from 'container/NewWidget/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { isEqual } from 'lodash-es';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import { fromPerses, toPerses } from '../../queryV5/persesQueryAdapters';

interface UsePanelEditorQuerySyncArgs {
	draft: DashboardtypesPanelDTO;
	panelType: PANEL_TYPES;
	setSpec: (next: DashboardtypesPanelSpecDTO) => void;
	/** Re-fetch the preview when the query is unchanged. */
	refetch: () => void;
}

interface UsePanelEditorQuerySyncApi {
	/** Run the current query (Stage & Run / ⌘↵). */
	runQuery: () => void;
}

/**
 * Connects the shared query builder (global `QueryBuilderProvider`, URL-synced)
 * to the V2 editor draft: seeds the builder from the panel on mount, and commits
 * the active query into `draft.spec.queries` (what the preview fetches) on a
 * query-type switch or Stage & Run.
 */
export function usePanelEditorQuerySync({
	draft,
	panelType,
	setSpec,
	refetch,
}: UsePanelEditorQuerySyncArgs): UsePanelEditorQuerySyncApi {
	const { currentQuery, stagedQuery, handleRunQuery } = useQueryBuilder();

	// Saved queries verbatim + their V1 form used to seed the builder. Captured
	// once — the draft itself is seeded by usePanelEditorDraft.
	// eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
	const savedQueries = useMemo(() => draft.spec?.queries ?? [], []);
	const seedQuery = useMemo(
		() => fromPerses(savedQueries, panelType),
		[savedQueries, panelType],
	);
	useShareBuilderUrl({ defaultValue: seedQuery });

	// Change-detection baseline: the provider's normalized form of the saved
	// query, published as the first `stagedQuery` on this route (cleared on route
	// change, so never stale). Comparing against this — not the raw `fromPerses`
	// seed — stops provider normalization from reading as an edit.
	const baselineRef = useRef<Query | null>(null);
	if (!baselineRef.current && stagedQuery) {
		baselineRef.current = stagedQuery;
	}

	// Write `query` into the draft, or restore the saved queries when it isn't a
	// genuine edit (so opening / re-running doesn't dirty the draft). Returns
	// whether the draft changed.
	const commitQuery = useCallback(
		(query: Query): boolean => {
			const baseline = baselineRef.current;
			const next =
				baseline && getIsQueryModified(query, baseline)
					? toPerses(query, panelType)
					: savedQueries;
			if (isEqual(next, draft.spec?.queries ?? [])) {
				return false;
			}
			setSpec({ ...draft.spec, queries: next });
			return true;
		},
		[panelType, savedQueries, draft.spec, setSpec],
	);

	// Commit on a query-type switch so the preview matches the selected tab. Refs
	// read the latest query/commit while the effect fires only on a type change.
	const commitRef = useRef(commitQuery);
	commitRef.current = commitQuery;
	const queryRef = useRef(currentQuery);
	queryRef.current = currentQuery;
	useEffect(() => {
		commitRef.current(queryRef.current);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- type change only
	}, [currentQuery.queryType]);

	// Stage & Run / ⌘↵: stage (V1 URL + step-interval semantics), commit, and
	// re-fetch when unchanged so the same query can be re-run.
	const runQuery = useCallback((): void => {
		handleRunQuery();
		if (!commitQuery(currentQuery)) {
			refetch();
		}
	}, [handleRunQuery, commitQuery, currentQuery, refetch]);

	return { runQuery };
}
