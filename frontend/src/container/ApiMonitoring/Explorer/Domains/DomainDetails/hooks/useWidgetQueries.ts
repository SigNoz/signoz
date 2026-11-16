import { useCallback, useMemo } from 'react';
import {
	Query as ReactQuery,
	useIsFetching,
	useQueryClient,
} from 'react-query';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { Widgets } from 'types/api/widgets/widget';

interface UseWidgetQueriesReturn {
	isFetching: boolean;
	refetch: () => void;
}

/**
 * These widgets' `GridCard` queries. Matches on the widget's query id, so
 * another tab's cards are neither counted nor refetched.
 */
export function useWidgetQueries(widgets: Widgets[]): UseWidgetQueriesReturn {
	const queryClient = useQueryClient();

	const predicate = useMemo(() => {
		const queryIds = new Set(
			widgets
				.map((widget) => widget.query?.id)
				.filter((id): id is string => Boolean(id)),
		);
		return ({ queryKey }: ReactQuery): boolean =>
			Array.isArray(queryKey) &&
			queryKey[0] === REACT_QUERY_KEY.DASHBOARD_GRID_CARD_QUERY_RANGE &&
			queryKey.some((part) => {
				const id = (part as Query | undefined)?.id;
				return !!id && queryIds.has(id);
			});
	}, [widgets]);

	const isFetching = useIsFetching({ predicate }) > 0;

	const refetch = useCallback((): void => {
		void queryClient.refetchQueries({ predicate, active: true });
	}, [queryClient, predicate]);

	return { isFetching, refetch };
}
