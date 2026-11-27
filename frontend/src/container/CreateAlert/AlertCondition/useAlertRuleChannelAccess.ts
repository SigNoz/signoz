import { useMemo } from 'react';
import type { ChannelOption } from 'hooks/notificationChannels/useChannelOptions';
import {
	type UseChannelPickerAccessReturn,
	useChannelPickerAccess,
} from 'hooks/notificationChannels/useChannelPickerAccess';
import {
	buildRuleAttachPermission,
	buildRuleDetachPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';

import { useCreateAlertState } from '../context';
import type { Threshold } from '../context/types';

/**
 * One threshold's channel picker. An edit checks `attach`/`detach` on the rule
 * and each channel; a new rule has no id, so its own `attach` is checked on
 * Save, as for a new routing policy. The backend diffs the rule's channels as
 * one set, so a channel another threshold holds, or a saved one this threshold
 * no longer holds, needs no check.
 */
export function useAlertRuleChannelAccess(
	threshold: Threshold,
	channels: ChannelOption[],
	testIdPrefix: string,
): Pick<UseChannelPickerAccessReturn, 'options' | 'onPickerVisibleChange'> {
	const { isEditMode, ruleId, savedChannelNames, thresholdState } =
		useCreateAlertState();
	const editedRuleId = isEditMode && ruleId ? ruleId : undefined;

	const owner = useMemo(
		() =>
			editedRuleId
				? {
						attach: buildRuleAttachPermission(editedRuleId),
						detach: buildRuleDetachPermission(editedRuleId),
					}
				: undefined,
		[editedRuleId],
	);

	const exemptChannelNames = useMemo(() => {
		const own = new Set(threshold.channels);
		return [
			...thresholdState.thresholds
				.filter((other) => other.id !== threshold.id)
				.flatMap((other) => other.channels),
			...savedChannelNames.filter((name) => !own.has(name)),
		];
	}, [
		threshold.id,
		threshold.channels,
		thresholdState.thresholds,
		savedChannelNames,
	]);

	const { options, onPickerVisibleChange } = useChannelPickerAccess({
		owner,
		savedChannelNames,
		exemptChannelNames,
		channels,
		testIdPrefix,
	});

	return { options, onPickerVisibleChange };
}
