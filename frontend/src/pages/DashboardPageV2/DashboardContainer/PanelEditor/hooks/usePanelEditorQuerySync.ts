import { useCallback, useMemo } from 'react';
import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { isEqual } from 'lodash-es';

import { fromPerses, toPerses } from '../../queryV5/persesQueryAdapters';

interface UsePanelEditorQuerySyncArgs {
	draft: DashboardtypesPanelDTO;
	panelType: PANEL_TYPES;
	setSpec: (next: DashboardtypesPanelSpecDTO) => void;
	/** Force a re-fetch of the preview when the query is unchanged. */
	refetch: () => void;
}

interface UsePanelEditorQuerySyncApi {
	/** Run the current builder query: writes it into the draft (re-fetching the
	 *  preview) or, when unchanged, forces a re-fetch. Wired to Stage & Run / ⌘↵. */
	runQuery: () => void;
}

/**
 * Bridges the shared query builder (which reads/writes the global
 * `QueryBuilderProvider` + the URL `compositeQuery` param) and the V2 panel
 * editor draft (perses `spec.queries`):
 *
 *  - on mount, seeds the builder from the panel's queries (`fromPerses` →
 *    `useShareBuilderUrl`, which writes the URL only when absent so a
 *    refresh / deep link keeps an in-progress query);
 *  - exposes `runQuery` for Stage & Run / ⌘↵: it stages the query (V1
 *    `handleRunQuery` — URL sync, recent query, step interval) and converts the
 *    live query to perses. A changed query is written into the draft (the
 *    preview re-fetches off the new `spec.queries`); an unchanged query just
 *    forces a `refetch`, so the same query can be re-run repeatedly.
 */
export function usePanelEditorQuerySync({
	draft,
	panelType,
	setSpec,
	refetch,
}: UsePanelEditorQuerySyncArgs): UsePanelEditorQuerySyncApi {
	const { currentQuery, handleRunQuery } = useQueryBuilder();

	// Mount-only: the draft's queries are seeded once by usePanelEditorDraft.
	const seedQuery = useMemo(
		() => fromPerses(draft.spec?.queries || [], panelType),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);
	useShareBuilderUrl({ defaultValue: seedQuery });

	// The saved query's normalized perses form. Running an unchanged query yields
	// this; comparing against it (not the stored, un-normalized queries) avoids
	// marking the draft dirty just for running.
	const seedPerses = useMemo(
		() => toPerses(seedQuery, panelType),
		[seedQuery, panelType],
	);

	const runQuery = useCallback((): void => {
		// Keep the V1 staging semantics (URL/compositeQuery sync, recent query,
		// step-interval normalization).
		handleRunQuery();

		const queries = toPerses(currentQuery, panelType);

		// Unchanged from the saved panel → re-run without dirtying the draft.
		if (isEqual(queries, seedPerses)) {
			refetch();
			return;
		}
		// Changed → update the draft; the preview re-fetches off the new
		// `spec.queries`. Otherwise it's the same query already in the draft, so
		// force a re-run.
		if (!isEqual(queries, draft.spec?.queries || [])) {
			setSpec({ ...draft.spec, queries });
		} else {
			refetch();
		}
	}, [
		handleRunQuery,
		currentQuery,
		panelType,
		seedPerses,
		draft.spec,
		setSpec,
		refetch,
	]);

	return { runQuery };
}
