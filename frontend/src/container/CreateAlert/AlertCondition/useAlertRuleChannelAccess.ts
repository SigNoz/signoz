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

/**
 * The rule form's channel picker. An edit checks `attach`/`detach` on the rule
 * and each channel; a new rule has no id, so its own `attach` is checked on
 * Save, as for a new routing policy.
 */
export function useAlertRuleChannelAccess(
	channels: ChannelOption[],
	testIdPrefix: string,
): Pick<UseChannelPickerAccessReturn, 'options' | 'onPickerVisibleChange'> {
	const { isEditMode, ruleId, savedChannelNames } = useCreateAlertState();
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

	const { options, onPickerVisibleChange } = useChannelPickerAccess({
		owner,
		savedChannelNames,
		channels,
		testIdPrefix,
	});

	return { options, onPickerVisibleChange };
}
