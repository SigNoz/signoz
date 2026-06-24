import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { toQueryEnvelopes } from '../../queryV5/buildQueryRangeRequest';
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
	/** True when the live builder query differs from the saved query (compared builder-normalized to avoid re-serialization noise). */
	isQueryDirty: boolean;
	/** Bake the live query into a spec for saving so unstaged edits persist; returns the spec untouched when unchanged. */
	buildSaveSpec: (
		spec: DashboardtypesPanelSpecDTO,
	) => DashboardtypesPanelSpecDTO;
}

/**
 * Bridges the shared (URL-synced) query builder and the V2 editor draft: seeds the
 * builder from the saved panel, then commits the active query into `draft.spec.queries`
 * (what the preview fetches) on a query-type/datasource switch and on Stage & Run.
 */
export function usePanelEditorQuerySync({
	draft,
	panelType,
	setSpec,
	refetch,
}: UsePanelEditorQuerySyncArgs): UsePanelEditorQuerySyncApi {
	const { currentQuery, stagedQuery, handleRunQuery } = useQueryBuilder();

	// Saved queries, captured once: seed the builder and serve as the restore target.
	// eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only snapshot
	const savedQueries = useMemo(() => draft.spec?.queries ?? [], []);
	const seedQuery = useMemo(
		() => fromPerses(savedQueries, panelType),
		[savedQueries, panelType],
	);
	// Force-reset the builder to the SAVED panel on first render only, discarding any
	// stale URL query from a prior edit — otherwise the QB and preview diverge and the
	// dirty baseline gets captured from the URL. After mount the URL syncs normally.
	const isInitialRenderRef = useRef(true);
	useShareBuilderUrl({
		defaultValue: seedQuery,
		forceReset: isInitialRenderRef.current,
	});
	useEffect(() => {
		isInitialRenderRef.current = false;
	}, []);

	// Commit the live query into the draft (what the preview fetches). The dirty check
	// compares against the SAVED query (`seedQuery`), not the URL-synced staged query,
	// which can carry stale state across a refresh and make a real switch read as
	// "unchanged". Unchanged → restore saved queries; changed → commit. Returns whether
	// the draft changed.
	const commitQuery = useCallback(
		(query: Query): boolean => {
			const next = getIsQueryModified(query, seedQuery)
				? toPerses(query, panelType)
				: savedQueries;
			// No-op guard at the V5 envelope level: equivalent wrappers (bare
			// `signoz/BuilderQuery` vs `signoz/CompositeQuery`) unwrap to the same
			// envelopes, so comparing them structurally would falsely dirty the draft.
			const current = draft.spec?.queries ?? [];
			if (isEqual(toQueryEnvelopes(next), toQueryEnvelopes(current))) {
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

	// Re-commit on a query-type or datasource switch so the preview refetches. Skip
	// mount: the draft already holds the saved queries the builder is force-reset to.
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

	// Stage & Run / ⌘↵: stage, commit, and re-fetch when unchanged so it can be re-run.
	const runQuery = useCallback((): void => {
		handleRunQuery();
		if (!commitQuery(currentQuery)) {
			refetch();
		}
	}, [handleRunQuery, commitQuery, currentQuery, refetch]);

	// Dirty baseline: the builder's OWN normalized saved query (first non-null
	// `stagedQuery` after the mount reset). Comparing builder-normalized to
	// builder-normalized avoids serialization drift reading an untouched query as
	// modified. Held in state (not a ref) so capture re-triggers `isQueryDirty`;
	// captured once and never moved by Stage & Run, so it stays anchored to saved.
	const [queryBaseline, setQueryBaseline] = useState<Query | null>(null);
	useEffect(() => {
		if (queryBaseline === null && stagedQuery) {
			setQueryBaseline(stagedQuery);
		}
	}, [queryBaseline, stagedQuery]);

	const isQueryDirty =
		queryBaseline !== null && getIsQueryModified(currentQuery, queryBaseline);

	const buildSaveSpec = useCallback(
		(spec: DashboardtypesPanelSpecDTO): DashboardtypesPanelSpecDTO =>
			isQueryDirty
				? { ...spec, queries: toPerses(currentQuery, panelType) }
				: spec,
		[isQueryDirty, currentQuery, panelType],
	);

	return { runQuery, isQueryDirty, buildSaveSpec };
}
