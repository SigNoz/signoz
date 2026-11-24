import { useMemo } from 'react';
import { useChannelOptions } from 'hooks/notificationChannels/useChannelOptions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

import { useCreateAlertState } from '../context';
import { getRuleCreateChecks, getRuleSaveChecks } from '../ruleSaveChecks';

export interface UseAlertRuleSaveChecksReturn {
	saveChecks: BrandedPermission[];
	testChecks: BrandedPermission[];
	/** The channel list is still loading, so the channel checks are not known yet. */
	isResolvingChannels: boolean;
}

/**
 * Save and Test notification checks for the rule form. Rules name their
 * channels; the checks need channel ids, which come from the channel list the
 * form already loads. A name the list lacks is a deleted channel, which the
 * backend skips too.
 */
export function useAlertRuleSaveChecks(): UseAlertRuleSaveChecksReturn {
	const { thresholdState, savedChannels, isEditMode, ruleId } =
		useCreateAlertState();
	const { data: channels, isLoading } = useChannelOptions();

	const selectedChannels = useMemo(
		() => thresholdState.thresholds.flatMap((threshold) => threshold.channels),
		[thresholdState.thresholds],
	);

	return useMemo(() => {
		const idByName = new Map(channels.map((c) => [c.name, c.id]));
		const toIds = (names: string[]): string[] =>
			names.flatMap((name) => idByName.get(name) ?? []);
		const selectedChannelIds = toIds(selectedChannels);

		return {
			saveChecks: getRuleSaveChecks({
				ruleId: isEditMode ? ruleId : undefined,
				savedChannelIds: toIds(savedChannels),
				selectedChannelIds,
			}),
			testChecks: getRuleCreateChecks(selectedChannelIds),
			isResolvingChannels:
				isLoading && (selectedChannels.length > 0 || savedChannels.length > 0),
		};
	}, [channels, selectedChannels, savedChannels, isEditMode, ruleId, isLoading]);
}
