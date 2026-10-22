import { useQuery, UseQueryResult } from 'react-query';
import { listNotificationChannels } from 'api/generated/services/channels';
import {
	AlertmanagertypesChannelListOrderDTO,
	AlertmanagertypesChannelListSortDTO,
	AlertmanagertypesListedNotificationChannelDTO,
} from 'api/generated/services/sigNoz.schemas';
import { range } from 'lodash-es';

const PAGE_SIZE = 100;

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
		limit: PAGE_SIZE,
		offset,
		sort: AlertmanagertypesChannelListSortDTO.name,
		order: AlertmanagertypesChannelListOrderDTO.asc,
	});
}

/**
 * Every channel, for the pickers that let a rule or a policy name one. The list
 * API is paginated and silently clamps a larger limit, so the first page reports
 * the total and any remainder is fetched alongside rather than truncating. One
 * request covers an org with a page's worth of channels or fewer.
 */
async function fetchAllChannels(): Promise<ChannelOption[]> {
	const first = await fetchPage(0);
	const rest = await Promise.all(
		range(PAGE_SIZE, first.data.total, PAGE_SIZE).map(fetchPage),
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
