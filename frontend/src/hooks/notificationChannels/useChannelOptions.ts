import { useQuery, UseQueryResult } from 'react-query';
import { listNotificationChannels } from 'api/generated/services/channels';
import {
	AlertmanagertypesChannelListOrderDTO,
	AlertmanagertypesChannelListSortDTO,
	AlertmanagertypesListedNotificationChannelDTO,
} from 'api/generated/services/sigNoz.schemas';
import { range } from 'lodash-es';

/** The list API's own ceiling; a bigger limit is clamped to it server-side. */
const MAX_PAGE_SIZE = 200;

export const CHANNEL_OPTIONS_QUERY_KEY = ['notificationChannelOptions'];

export interface ChannelOption {
	id: string;
	/** The display name, which is what rules and routing policies reference. */
	name: string;
}

export type UseChannelOptionsResult = Omit<
	UseQueryResult<ChannelOption[], Error>,
	'data'
> & {
	data: ChannelOption[];
};

function fetchPage(
	offset: number,
): ReturnType<typeof listNotificationChannels> {
	return listNotificationChannels({
		limit: MAX_PAGE_SIZE,
		offset,
		sort: AlertmanagertypesChannelListSortDTO.name,
		order: AlertmanagertypesChannelListOrderDTO.asc,
	});
}

/**
 * Every channel, for the pickers that let a rule or a policy name one. The list
 * API pages at 200, so the first page reports the total and the rest are
 * fetched together rather than silently truncating.
 */
async function fetchAllChannels(): Promise<ChannelOption[]> {
	const first = await fetchPage(0);
	const rest = await Promise.all(
		range(MAX_PAGE_SIZE, first.data.total, MAX_PAGE_SIZE).map(fetchPage),
	);

	const channels: AlertmanagertypesListedNotificationChannelDTO[] = [
		...first.data.channels,
		...rest.flatMap((page) => page.data.channels),
	];

	return channels.map((channel) => ({
		id: channel.id,
		name: channel.displayName,
	}));
}

export function useChannelOptions(): UseChannelOptionsResult {
	const query = useQuery<ChannelOption[], Error>(
		CHANNEL_OPTIONS_QUERY_KEY,
		fetchAllChannels,
	);

	return { ...query, data: query.data ?? [] };
}
