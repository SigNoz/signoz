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
	/** Re-fetch the preview when the query is unchanged (Stage & Run on a no-op). */
	refetch: () => void;
}

interface UsePanelEditorQuerySyncApi {
	/** Run the current query (Stage & Run / ⌘↵). */
	runQuery: () => void;
}

/**
 * Bridges the shared query builder (global `QueryBuilderProvider`, URL-synced) and
 * the V2 editor draft: seeds the builder from the saved panel, then commits the
 * active query into `draft.spec.queries` (what the preview fetches) on a query-type
 * or datasource switch and on Stage & Run.
 */
export function usePanelEditorQuerySync({
	draft,
	panelType,
	setSpec,
	refetch,
}: UsePanelEditorQuerySyncArgs): UsePanelEditorQuerySyncApi {
	const { currentQuery, handleRunQuery } = useQueryBuilder();

	// Saved queries, captured once: seed the builder and serve as the restore target.
	// eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only snapshot
	const savedQueries = useMemo(() => draft.spec?.queries ?? [], []);
	const seedQuery = useMemo(
		() => fromPerses(savedQueries, panelType),
		[savedQueries, panelType],
	);
	// Open the builder from the SAVED panel, discarding any stale URL query left by
	// a prior edit/refresh — otherwise the QB shows the URL query while the preview
	// keeps fetching the saved one, and the dirty baseline gets captured from the URL
	// (so switching back to that datasource reads as "unchanged" and never commits).
	// Force-reset on the first render only; after that the URL syncs normally.
	const isInitialRenderRef = useRef(true);
	useShareBuilderUrl({
		defaultValue: seedQuery,
		forceReset: isInitialRenderRef.current,
	});
	useEffect(() => {
		isInitialRenderRef.current = false;
	}, []);

	// Commit the live query into the draft (what the preview fetches). The dirty
	// check compares against the SAVED query (`seedQuery`), not the URL-synced
	// staged query — a staged query can carry stale state across a refresh, which
	// would make a real datasource switch read as "unchanged" and silently revert.
	// Unchanged from saved → restore the saved queries (don't dirty the draft);
	// changed → commit the live query. Returns whether the draft changed.
	const commitQuery = useCallback(
		(query: Query): boolean => {
			const next = getIsQueryModified(query, seedQuery)
				? toPerses(query, panelType)
				: savedQueries;
			if (isEqual(next, draft.spec?.queries ?? [])) {
				return false;
			}
			setSpec({ ...draft.spec, queries: next });
			return true;
		},
		[seedQuery, panelType, savedQueries, draft.spec, setSpec],
	);

	// Latest query/commit, read by the structural-change effect without re-subscribing.
	const commitRef = useRef(commitQuery);
	commitRef.current = commitQuery;
	const queryRef = useRef(currentQuery);
	queryRef.current = currentQuery;

	// Re-commit on a query-type or datasource switch so the preview refetches the
	// structurally-changed query. Skip mount: the draft already holds the saved
	// queries and the builder is being force-reset to them.
	const dataSourceSignature = useMemo(
		() =>
			(currentQuery.builder?.queryData ?? []).map((q) => q.dataSource).join(','),
		[currentQuery.builder],
	);
	const didMountRef = useRef(false);
	useEffect(() => {
		if (!didMountRef.current) {
			didMountRef.current = true;
			return;
		}
		commitRef.current(queryRef.current);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- structural change only
	}, [currentQuery.queryType, dataSourceSignature]);

	// Stage & Run / ⌘↵: stage, commit, and re-fetch when unchanged so the same query
	// can be re-run.
	const runQuery = useCallback((): void => {
		handleRunQuery();
		if (!commitQuery(currentQuery)) {
			refetch();
		}
	}, [handleRunQuery, commitQuery, currentQuery, refetch]);

	return { runQuery };
}
