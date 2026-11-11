import { useIsFetching } from 'react-query';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { Widgets } from 'types/api/widgets/widget';

/**
 * Whether any of these widgets' `GridCard` queries is fetching. Matches on the
 * widget's query id, so another tab's cards still in flight do not count.
 */
export function useIsFetchingWidgets(widgets: Widgets[]): boolean {
	const queryIds = new Set(
		widgets
			.map((widget) => widget.query?.id)
			.filter((id): id is string => Boolean(id)),
	);

	return (
		useIsFetching({
			predicate: ({ queryKey }) =>
				Array.isArray(queryKey) &&
				queryKey[0] === REACT_QUERY_KEY.DASHBOARD_GRID_CARD_QUERY_RANGE &&
				queryKey.some((part) => {
					const id = (part as Query | undefined)?.id;
					return !!id && queryIds.has(id);
				}),
		}) > 0
	);
}
