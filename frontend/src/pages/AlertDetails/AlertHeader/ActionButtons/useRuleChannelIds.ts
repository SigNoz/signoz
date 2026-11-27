import { useMemo } from 'react';
import { useCreateAlertState } from 'container/CreateAlert/context';
import { useChannelOptions } from 'hooks/notificationChannels/useChannelOptions';
import { getChannelIds } from 'hooks/notificationChannels/utils';

/** Ids of the channels the open rule notifies. */
export function useRuleChannelIds(): string[] {
	const { savedChannelNames } = useCreateAlertState();
	const { data: channels } = useChannelOptions();

	return useMemo(
		() => getChannelIds(channels, savedChannelNames),
		[channels, savedChannelNames],
	);
}
