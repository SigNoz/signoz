import { useMemo } from 'react';
import { useCreateAlertState } from 'container/CreateAlert/context';
import { useChannelOptions } from 'hooks/notificationChannels/useChannelOptions';

/**
 * Ids of the channels the open rule notifies. Rules name their channels and
 * the checks need ids; a name the list lacks is a deleted channel, which the
 * backend skips too.
 */
export function useRuleChannelIds(): string[] {
	const { savedChannelNames } = useCreateAlertState();
	const { data: channels } = useChannelOptions();

	return useMemo(() => {
		const idByName = new Map(channels.map(({ id, name }) => [name, id]));
		return savedChannelNames.flatMap((name) => idByName.get(name) ?? []);
	}, [channels, savedChannelNames]);
}
