import { RefObject, useMemo } from 'react';
import { sortByColumn } from 'components/Alerts/utils';
import { useCalculatedPageSize } from 'components/TanStackTableView/useCalculatedPageSize';
import { useTableParams } from 'components/TanStackTableView/useTableParams';

import { RoutingPolicy } from './types';

export const ROUTING_POLICIES_QUERY_PARAMS = {
	orderBy: 'orderBy',
	page: 'page',
	limit: 'limit',
} as const;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

function getSortValue(
	policy: RoutingPolicy,
	columnName: string,
): string | number {
	switch (columnName) {
		case 'name':
			return policy.name.toLowerCase();
		case 'createdAt':
			return policy.createdAt ? new Date(policy.createdAt).getTime() : 0;
		case 'updatedAt':
			return policy.updatedAt ? new Date(policy.updatedAt).getTime() : 0;
		default:
			return '';
	}
}

interface UseRoutingPoliciesTableReturn {
	containerRef: RefObject<HTMLDivElement>;
	calculatedPageSize: number | null;
	pagedPolicies: RoutingPolicy[];
	setPage: (page: number) => void;
	setLimit: (limit: number) => void;
}

function useRoutingPoliciesTable(
	routingPolicies: RoutingPolicy[],
): UseRoutingPoliciesTableReturn {
	const { containerRef, calculatedPageSize } = useCalculatedPageSize({
		rowHeight: 46,
	});

	const { orderBy, page, limit, setLimit, setPage } = useTableParams(
		ROUTING_POLICIES_QUERY_PARAMS,
		{
			page: DEFAULT_PAGE,
			limit: DEFAULT_LIMIT,
			storageKey: 'routing-policies',
			calculatedPageSize,
			cleanupOnUnmount: true,
		},
	);

	const pagedPolicies = useMemo(() => {
		const sorted = sortByColumn(routingPolicies, orderBy, getSortValue);
		const start = (page - 1) * limit;
		return sorted.slice(start, start + limit);
	}, [routingPolicies, orderBy, page, limit]);

	return {
		containerRef,
		calculatedPageSize,
		pagedPolicies,
		setPage,
		setLimit,
	};
}

export default useRoutingPoliciesTable;
