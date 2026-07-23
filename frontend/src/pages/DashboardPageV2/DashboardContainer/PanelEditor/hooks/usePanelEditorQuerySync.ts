import { useCallback, useEffect, useMemo, useRef } from 'react';
import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelSpecDTO,
	DashboardtypesQueryDTO,
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
	/**
	 * The persisted panel's queries — the dirty baseline. Distinct from `draft.spec.queries`,
	 * which the builder seeds from and may carry unsaved edits handed off from View mode. Omit
	 * for a new panel, where the seed query is the baseline.
	 */
	savedQueries?: DashboardtypesQueryDTO[];
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
	savedQueries,
}: UsePanelEditorQuerySyncArgs): UsePanelEditorQuerySyncApi {
	const { currentQuery, stagedQuery, handleRunQuery } = useQueryBuilder();

	const draftQueries = draft.spec.queries;

	// A new panel has no saved query: seed from the kind's first supported signal rather
	// than `fromPerses`'s metrics default (which List doesn't support).
	const seedQuery = useMemo(
		() =>
			draftQueries.length === 0 && signal
				? initialQueriesMap[signal]
				: fromPerses(draftQueries, panelType),
		[draftQueries, panelType, signal],
	);
	// No forceReset: seed the builder only when the URL carries no query, so an
	// in-editor edit in the URL survives a refresh / browser Back-Forward.
	useShareBuilderUrl({ defaultValue: seedQuery });

	// Commit the live query into the draft (what the preview fetches).
	const commitQuery = useCallback(
		(query: Query): boolean => {
			const next = getIsQueryModified(query, seedQuery)
				? toPerses(query, panelType)
				: draftQueries;
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
		[seedQuery, panelType, draftQueries, draft.spec, setSpec],
	);

	// Latest query/commit, read by the structural-change effect without re-subscribing.
	const commitRef = useRef(commitQuery);
	commitRef.current = commitQuery;
	const queryRef = useRef(currentQuery);
	queryRef.current = currentQuery;

	// Re-commit on a query-type/datasource switch so the preview refetches. Skip
	// mount: the initial query is synced into the draft by the staged-query effect below.
	const dataSources = useMemo(
		() => (currentQuery.builder?.queryData ?? []).map((q) => q.dataSource),
		[currentQuery.builder],
	);
	const dataSourceSignature = dataSources.join(',');
	const prevDataSourcesRef = useRef(dataSources);
	const didMountRef = useRef(false);
	useEffect(() => {
		const prev = prevDataSourcesRef.current;
		prevDataSourcesRef.current = dataSources;
		if (!didMountRef.current) {
			didMountRef.current = true;
			return;
		}
		// An added query is still empty — don't auto-run it; it commits on Run Query.
		const isQueryAdded =
			dataSources.length > prev.length &&
			prev.every((source, index) => source === dataSources[index]);
		if (isQueryAdded) {
			return;
		}
		commitRef.current(queryRef.current);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- structural change only
	}, [currentQuery.queryType, dataSourceSignature]);

	// Follow the staged (executed) query into the draft on a URL re-stage (mount
	// hydration, browser Back/Forward) so the preview matches. Live edits touch only
	// currentQuery, so they still wait for Run; commitQuery no-ops when unchanged.
	useEffect(() => {
		if (stagedQuery) {
			commitRef.current(stagedQuery);
		}
	}, [stagedQuery]);

	// Stage & Run / ⌘↵: stage, commit, and re-fetch when unchanged so it can be re-run.
	const runQuery = useCallback((): void => {
		handleRunQuery();
		if (!commitQuery(currentQuery)) {
			refetch();
		}
	}, [handleRunQuery, commitQuery, currentQuery, refetch]);

	// Dirty = the live query no longer serializes to the SAVED panel's query, compared at
	// the V5 envelope level. Anchoring to `savedQueries` (not the builder-seed) keeps a
	// handed-off / URL-restored edit reading as dirty; routing both sides through the same
	// `fromPerses → toPerses` round-trip stops builder-added defaults (absent from an older
	// stored query) reading an untouched panel as modified. New panel: fall back to seed.
	const baselineEnvelopes = useMemo(
		() =>
			toQueryEnvelopes(
				toPerses(
					savedQueries ? fromPerses(savedQueries, panelType) : seedQuery,
					panelType,
				),
			),
		[savedQueries, seedQuery, panelType],
	);
	const isQueryDirty = useMemo(
		() =>
			!isEqual(
				toQueryEnvelopes(toPerses(currentQuery, panelType)),
				baselineEnvelopes,
			),
		[currentQuery, panelType, baselineEnvelopes],
	);

	const buildSaveSpec = useCallback(
		(spec: DashboardtypesPanelSpecDTO): DashboardtypesPanelSpecDTO =>
			isQueryDirty || alwaysSerializeQuery
				? { ...spec, queries: toPerses(currentQuery, panelType) }
				: spec,
		[isQueryDirty, alwaysSerializeQuery, currentQuery, panelType],
	);

	return { runQuery, isQueryDirty, buildSaveSpec };
}
