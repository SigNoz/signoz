import { useQuery, UseQueryResult } from 'react-query';
import { listNotificationChannels } from 'api/generated/services/channels';
import {
	AlertmanagertypesChannelListOrderDTO,
	AlertmanagertypesChannelListSortDTO,
	AlertmanagertypesListedNotificationChannelDTO,
} from 'api/generated/services/sigNoz.schemas';

/** The list API's own ceiling; a bigger limit is clamped to it server-side. */
const MAX_PAGE_SIZE = 200;

export const CHANNEL_OPTIONS_QUERY_KEY = ['notificationChannelOptions'];

export interface ChannelOption {
	id: string;
	/** The display name, which is what rules and routing policies reference. */
	name: string;
}

/**
 * Every channel, for the pickers that let a rule or a policy name one. The list
 * API pages at 200, so this walks the pages rather than silently truncating.
 */
async function fetchAllChannels(): Promise<ChannelOption[]> {
	const channels: AlertmanagertypesListedNotificationChannelDTO[] = [];
	let total = 0;

	do {
		// eslint-disable-next-line no-await-in-loop
		const page = await listNotificationChannels({
			limit: MAX_PAGE_SIZE,
			offset: channels.length,
			sort: AlertmanagertypesChannelListSortDTO.name,
			order: AlertmanagertypesChannelListOrderDTO.asc,
		});

		total = page.data.total;
		channels.push(...page.data.channels);

		if (page.data.channels.length === 0) {
			break;
		}
	} while (channels.length < total);

	return channels.map((channel) => ({
		id: channel.id,
		name: channel.displayName,
	}));
}

export function useChannelOptions(): UseQueryResult<ChannelOption[], Error> {
	return useQuery<ChannelOption[], Error>(
		CHANNEL_OPTIONS_QUERY_KEY,
		fetchAllChannels,
	);
}
