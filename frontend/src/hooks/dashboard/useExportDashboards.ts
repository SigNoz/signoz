import { useCallback, useMemo } from 'react';
import { useListDashboardsForUserV2 } from 'api/generated/services/dashboard';
import { DashboardtypesListedDashboardForUserV2DTO } from 'api/generated/services/sigNoz.schemas';
import { useGetAllDashboard } from 'hooks/dashboard/useGetAllDashboard';
import useDebounce from 'hooks/useDebounce';
import { useIsDashboardV2 } from 'hooks/useIsDashboardV2';
import { Dashboard } from 'types/api/dashboard/getAll';

const V2_LIST_LIMIT = 1000;
const SEARCH_DEBOUNCE_MS = 300;

/** Neutral id+title the picker uses in place of the V1/V2 dashboard entity. */
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

function fromV1(dashboard: Dashboard): ExportDashboard {
	return { id: dashboard.id, title: dashboard.data.title ?? '' };
}

function filterByTitle(
	dashboards: ExportDashboard[],
	search: string,
): ExportDashboard[] {
	const term = search.trim().toLowerCase();
	if (!term) {
		return dashboards;
	}
	return dashboards.filter((dashboard) =>
		dashboard.title.toLowerCase().includes(term),
	);
}

// The V2 list `query` is a filter DSL (`key OP value`), not free text — wrap a typed term
// as a name-contains clause (single quotes escaped).
function toNameQuery(search: string): string | undefined {
	const term = search.trim();
	return term ? `name CONTAINS '${term.replace(/'/g, "\\'")}'` : undefined;
}

/** Flag-aware picker source: V2 searches server-side (debounced), V1 filters in memory. */
export function useExportDashboards(search = ''): UseExportDashboardsResult {
	const isDashboardV2 = useIsDashboardV2();
	const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

	const v1 = useGetAllDashboard({ enabled: !isDashboardV2 });
	const v2 = useListDashboardsForUserV2(
		{ limit: V2_LIST_LIMIT, query: toNameQuery(debouncedSearch) },
		{ query: { enabled: isDashboardV2, keepPreviousData: true } },
	);

	const dashboards = useMemo<ExportDashboard[]>(
		() =>
			isDashboardV2
				? (v2.data?.data?.dashboards ?? []).map(fromV2)
				: filterByTitle((v1.data?.data ?? []).map(fromV1), search),
		[isDashboardV2, v1.data, v2.data, search],
	);

	const refetch = useCallback((): void => {
		if (isDashboardV2) {
			void v2.refetch();
		} else {
			void v1.refetch();
		}
	}, [isDashboardV2, v1, v2]);

	return {
		dashboards,
		isLoading: isDashboardV2 ? v2.isLoading : v1.isLoading,
		isFetching: isDashboardV2 ? v2.isFetching : v1.isFetching,
		refetch,
	};
}
