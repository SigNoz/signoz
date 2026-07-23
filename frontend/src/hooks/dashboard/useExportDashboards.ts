import { useCallback, useMemo } from 'react';
import { useListDashboardsForUserV2 } from 'api/generated/services/dashboard';
import { DashboardtypesListedDashboardForUserV2DTO } from 'api/generated/services/sigNoz.schemas';
import useDebounce from 'hooks/useDebounce';

const V2_LIST_LIMIT = 1000;
const SEARCH_DEBOUNCE_MS = 300;

/** Neutral id+title the picker uses in place of the dashboard entity. */
export interface ExportDashboard {
	id: string;
	title: string;
}

export interface UseExportDashboardsResult {
	dashboards: ExportDashboard[];
	/** First load only — disables the picker until there are options. */
	isLoading: boolean;
	/** Any fetch incl. a search refetch — drives the picker spinner. */
	isFetching: boolean;
	refetch: () => void;
}

function fromV2(
	item: DashboardtypesListedDashboardForUserV2DTO,
): ExportDashboard {
	return { id: item.id, title: item.spec.display?.name || item.name };
}

// The V2 list `query` is a filter DSL (`key OP value`), not free text — wrap a typed term
// as a name-contains clause (single quotes escaped).
function toNameQuery(search: string): string | undefined {
	const term = search.trim();
	return term ? `name CONTAINS '${term.replace(/'/g, "\\'")}'` : undefined;
}

/** Picker source: searches the V2 dashboard list server-side (debounced). */
export function useExportDashboards(search = ''): UseExportDashboardsResult {
	const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

	const v2 = useListDashboardsForUserV2(
		{ limit: V2_LIST_LIMIT, query: toNameQuery(debouncedSearch) },
		{ query: { keepPreviousData: true } },
	);

	const dashboards = useMemo<ExportDashboard[]>(
		() => (v2.data?.data?.dashboards ?? []).map(fromV2),
		[v2.data],
	);

	const refetch = useCallback((): void => {
		void v2.refetch();
	}, [v2]);

	return {
		dashboards,
		isLoading: v2.isLoading,
		isFetching: v2.isFetching,
		refetch,
	};
}
