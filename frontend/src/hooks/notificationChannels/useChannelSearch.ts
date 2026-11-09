import { UIEvent, useCallback, useMemo, useState } from 'react';
import { useInfiniteQuery } from 'react-query';
import {
	listNotificationChannels,
	ListNotificationChannelsQueryError,
} from 'api/generated/services/channels';
import {
	AlertmanagertypesChannelListOrderDTO,
	AlertmanagertypesChannelListSortDTO,
	ListNotificationChannelsParams,
} from 'api/generated/services/sigNoz.schemas';
import useDebounce from 'hooks/useDebounce';

const PAGE_SIZE = 100;
const SEARCH_DEBOUNCE_MS = 300;
const LOAD_MORE_THRESHOLD_PX = 40;

export interface ChannelSelectOption {
	/** What a rule or routing policy stores: today the display name. */
	value: string;
	label: string;
}

export interface UseChannelSearchResult {
	options: ChannelSelectOption[];
	/** How many channels match the current search, across every page. */
	total: number | undefined;
	searchTerm: string;
	setSearchTerm: (term: string) => void;
	/** A typed term is waiting on the debounce or on its first page. */
	isSearching: boolean;
	isLoading: boolean;
	isError: boolean;
	error: ListNotificationChannelsQueryError | null;
	refetch: () => void;
	loadMoreOnScroll: (event: UIEvent<HTMLDivElement>) => void;
}

export function useChannelSearch(): UseChannelSearchResult {
	const [searchTerm, setSearchTerm] = useState('');
	const trimmedTerm = searchTerm.trim();
	const debouncedTerm = useDebounce(trimmedTerm, SEARCH_DEBOUNCE_MS);
	// Clearing the box skips the debounce: the unfiltered list is already cached.
	const query = trimmedTerm ? debouncedTerm : '';

	const params: ListNotificationChannelsParams = {
		query: query || undefined,
		limit: PAGE_SIZE,
		sort: AlertmanagertypesChannelListSortDTO.name,
		order: AlertmanagertypesChannelListOrderDTO.asc,
	};

	const {
		data,
		isLoading,
		isError,
		error,
		refetch,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
	} = useInfiniteQuery<
		Awaited<ReturnType<typeof listNotificationChannels>>,
		ListNotificationChannelsQueryError
	>({
		queryKey: ['notificationChannelSearch', params],
		queryFn: ({ pageParam = 0, signal }) =>
			listNotificationChannels({ ...params, offset: pageParam }, signal),
		getNextPageParam: (lastPage, allPages) => {
			const loaded = allPages.reduce(
				(count, page) => count + page.data.channels.length,
				0,
			);
			return lastPage.data.channels.length > 0 && loaded < lastPage.data.total
				? loaded
				: undefined;
		},
	});

	const isSearching = trimmedTerm !== query || isLoading;

	const options = useMemo(
		() =>
			isSearching
				? []
				: (data?.pages ?? []).flatMap((page) =>
						page.data.channels.map((channel) => ({
							value: channel.displayName,
							label: channel.displayName,
						})),
					),
		[data, isSearching],
	);

	const loadMoreOnScroll = useCallback(
		(event: UIEvent<HTMLDivElement>): void => {
			const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
			if (
				hasNextPage &&
				!isFetchingNextPage &&
				scrollHeight - scrollTop - clientHeight < LOAD_MORE_THRESHOLD_PX
			) {
				void fetchNextPage();
			}
		},
		[hasNextPage, isFetchingNextPage, fetchNextPage],
	);

	return {
		options,
		total: data?.pages[0]?.data.total,
		searchTerm,
		setSearchTerm,
		isSearching,
		isLoading,
		isError,
		error,
		refetch,
		loadMoreOnScroll,
	};
}
