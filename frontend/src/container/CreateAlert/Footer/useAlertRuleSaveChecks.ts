import { useMemo } from 'react';
import { useChannelOptions } from 'hooks/notificationChannels/useChannelOptions';
import { getChannelIds } from 'hooks/notificationChannels/utils';
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
 * Save and Test notification checks for the rule form. The channel ids come
 * from the channel list the form already loads.
 */
export function useAlertRuleSaveChecks(): UseAlertRuleSaveChecksReturn {
	const { thresholdState, savedChannelNames, isEditMode, ruleId } =
		useCreateAlertState();
	const { data: channels, isLoading } = useChannelOptions();

	const selectedChannels = useMemo(
		() => thresholdState.thresholds.flatMap((threshold) => threshold.channels),
		[thresholdState.thresholds],
	);

	return useMemo(() => {
		const selectedChannelIds = getChannelIds(channels, selectedChannels);

		return {
			saveChecks: getRuleSaveChecks({
				ruleId: isEditMode ? ruleId : undefined,
				savedChannelIds: getChannelIds(channels, savedChannelNames),
				selectedChannelIds,
			}),
			testChecks: getRuleCreateChecks(selectedChannelIds),
			isResolvingChannels:
				isLoading && (selectedChannels.length > 0 || savedChannelNames.length > 0),
		};
	}, [
		channels,
		selectedChannels,
		savedChannelNames,
		isEditMode,
		ruleId,
		isLoading,
	]);
}
