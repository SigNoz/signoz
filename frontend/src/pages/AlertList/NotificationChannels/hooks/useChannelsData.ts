import { useListNotificationChannels } from 'api/generated/services/channels';
import {
	AlertmanagertypesChannelKindDTO,
	AlertmanagertypesChannelListOrderDTO,
	AlertmanagertypesChannelListSortDTO,
	AlertmanagertypesListedNotificationChannelDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { SortState } from 'components/TanStackTableView';

import { KIND_FILTER_ALL } from '../constants';

/** Table column ids the list API can order by. */
const SORT_BY_COLUMN: Record<string, AlertmanagertypesChannelListSortDTO> = {
	name: AlertmanagertypesChannelListSortDTO.name,
	createdAt: AlertmanagertypesChannelListSortDTO.created_at,
	updatedAt: AlertmanagertypesChannelListSortDTO.updated_at,
};

interface UseChannelsDataArgs {
	search: string;
	kind: string;
	orderBy: SortState | null;
	page: number;
	limit: number;
	enabled?: boolean;
}

export interface ChannelsData {
	channels: AlertmanagertypesListedNotificationChannelDTO[];
	total: number;
	isFetching: boolean;
	isError: boolean;
	refetch: () => void;
}

/**
 * Search, kind filter, sort and paging all run on the API, so the table shows
 * one page at a time rather than filtering a full download in the browser.
 */
export function useChannelsData({
	search,
	kind,
	orderBy,
	page,
	limit,
	enabled = true,
}: UseChannelsDataArgs): ChannelsData {
	const sort = orderBy ? SORT_BY_COLUMN[orderBy.columnName] : undefined;

	const { data, isFetching, isError, refetch } = useListNotificationChannels(
		{
			limit,
			offset: (page - 1) * limit,
			...(sort
				? {
						sort,
						order: orderBy?.order as AlertmanagertypesChannelListOrderDTO,
					}
				: {}),
			...(search ? { query: search } : {}),
			...(kind !== KIND_FILTER_ALL
				? { kind: kind as AlertmanagertypesChannelKindDTO }
				: {}),
		},
		{ query: { enabled, keepPreviousData: true } },
	);

	return {
		channels: data?.data?.channels ?? [],
		total: data?.data?.total ?? 0,
		isFetching,
		isError,
		refetch,
	};
}
