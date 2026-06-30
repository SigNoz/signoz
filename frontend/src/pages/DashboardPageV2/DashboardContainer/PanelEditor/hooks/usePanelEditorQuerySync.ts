import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelSpecDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
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
	/**
	 * Serialize the live query on save even when unchanged. Set for a new panel,
	 * whose seed query is the builder default (not a real saved query).
	 */
	alwaysSerializeQuery?: boolean;
	/** Signal to seed a new panel's builder with — the kind's first supported signal. */
	signal?: TelemetrytypesSignalDTO;
}

interface UsePanelEditorQuerySyncApi {
	/** Run the current query (Stage & Run / ⌘↵). */
	runQuery: () => void;
	/** True when the live builder query differs from the saved query. */
	isQueryDirty: boolean;
	/** Bake the live query into a spec so unstaged edits persist; unchanged → spec untouched. */
	buildSaveSpec: (
		spec: DashboardtypesPanelSpecDTO,
	) => DashboardtypesPanelSpecDTO;
}

/**
 * Bridges the shared (URL-synced) query builder and the V2 editor draft: seeds the
 * builder from the saved panel, then commits the active query into
 * `draft.spec.queries` (what the preview fetches) on a query-type/datasource switch
 * and on Stage & Run.
 */
export function usePanelEditorQuerySync({
	draft,
	panelType,
	setSpec,
	refetch,
	alwaysSerializeQuery = false,
	signal,
}: UsePanelEditorQuerySyncArgs): UsePanelEditorQuerySyncApi {
	const { currentQuery, stagedQuery, handleRunQuery } = useQueryBuilder();

	// Saved queries, captured once: seed the builder and serve as the restore target.
	const savedQueries = draft.spec.queries;

	// A new panel has no saved query: seed from the kind's first supported signal
	// instead of letting `fromPerses` fall back to the metrics default (which List
	// doesn't support).
	const seedQuery = useMemo(
		() =>
			savedQueries.length === 0 && signal
				? initialQueriesMap[signal]
				: fromPerses(savedQueries, panelType),
		[savedQueries, panelType, signal],
	);
	// Force-reset the builder to the SAVED panel on first render only, discarding a
	// stale URL query from a prior edit (else the QB/preview diverge and the dirty
	// baseline is captured from the URL). After mount the URL syncs normally.
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
	// staged query, which can carry stale state across a refresh and read a real
	// switch as "unchanged". Returns whether the draft changed.
	const commitQuery = useCallback(
		(query: Query): boolean => {
			const next = getIsQueryModified(query, seedQuery)
				? toPerses(query, panelType)
				: savedQueries;
			// No-op guard at the V5 envelope level: equivalent wrappers (bare
			// `signoz/BuilderQuery` vs `signoz/CompositeQuery`) unwrap to the same
			// envelopes, so a structural compare would falsely dirty the draft.
			const current = draft.spec.queries;
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

	// Re-commit on a query-type/datasource switch so the preview refetches. Skip
	// mount: the draft already holds the saved queries the builder is reset to.
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
	// `stagedQuery` after the mount reset) — comparing builder-normalized to
	// builder-normalized avoids serialization drift reading an untouched query as
	// modified. In state (not a ref) so capture re-triggers `isQueryDirty`; captured
	// once and never moved by Stage & Run, so it stays anchored to saved.
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
			isQueryDirty || alwaysSerializeQuery
				? { ...spec, queries: toPerses(currentQuery, panelType) }
				: spec,
		[isQueryDirty, alwaysSerializeQuery, currentQuery, panelType],
	);

	return { runQuery, isQueryDirty, buildSaveSpec };
}
