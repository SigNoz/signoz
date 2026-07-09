import { useCallback, useMemo } from 'react';
import { useListDashboardsForUserV2 } from 'api/generated/services/dashboard';
import { DashboardtypesListedDashboardForUserV2DTO } from 'api/generated/services/sigNoz.schemas';
import { useGetAllDashboard } from 'hooks/dashboard/useGetAllDashboard';
import useDebounce from 'hooks/useDebounce';
import { useIsDashboardV2 } from 'hooks/useIsDashboardV2';
import { Dashboard } from 'types/api/dashboard/getAll';

const V2_LIST_LIMIT = 1000;
const SEARCH_DEBOUNCE_MS = 300;

export interface UseExportDashboardsResult {
	dashboards: Dashboard[];
	/** First load only — disables the picker until there are options. */
	isLoading: boolean;
	/** Any fetch incl. a search refetch — drives the picker spinner. */
	isFetching: boolean;
	refetch: () => void;
}

function toDashboard(
	item: DashboardtypesListedDashboardForUserV2DTO,
): Dashboard {
	return {
		id: item.id,
		createdAt: item.createdAt ?? '',
		updatedAt: item.updatedAt ?? '',
		createdBy: item.createdBy ?? '',
		updatedBy: item.updatedBy ?? '',
		locked: item.locked,
		data: { title: item.spec.display?.name || item.name },
	};
}

function filterByTitle(dashboards: Dashboard[], search: string): Dashboard[] {
	const term = search.trim().toLowerCase();
	if (!term) {
		return dashboards;
	}
	return dashboards.filter((dashboard) =>
		(dashboard.data.title ?? '').toLowerCase().includes(term),
	);
}

// The V2 list `query` is a filter DSL (`key OP value`), not free text — wrap a typed term
// as a name-contains clause (single quotes escaped).
function toNameQuery(search: string): string | undefined {
	const term = search.trim();
	return term ? `name CONTAINS '${term.replace(/'/g, "\\'")}'` : undefined;
}

/**
 * Flag-aware, search-filtered source for the "Add to dashboard" picker. V2 searches
 * server-side (debounced); V1 filters its already-complete list in memory.
 */
export function useExportDashboards(search = ''): UseExportDashboardsResult {
	const isDashboardV2 = useIsDashboardV2();
	const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

	const v1 = useGetAllDashboard({ enabled: !isDashboardV2 });
	const v2 = useListDashboardsForUserV2(
		{ limit: V2_LIST_LIMIT, query: toNameQuery(debouncedSearch) },
		{ query: { enabled: isDashboardV2, keepPreviousData: true } },
	);

	const dashboards = useMemo<Dashboard[]>(
		() =>
			isDashboardV2
				? (v2.data?.data?.dashboards ?? []).map(toDashboard)
				: filterByTitle(v1.data?.data ?? [], search),
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
