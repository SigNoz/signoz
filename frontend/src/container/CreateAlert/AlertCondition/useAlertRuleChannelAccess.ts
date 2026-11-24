import { useCallback, useMemo } from 'react';
import type { ChannelOption } from 'hooks/notificationChannels/useChannelOptions';
import {
	buildNotificationChannelAttachPermission,
	buildNotificationChannelDetachPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import {
	buildRuleAttachPermission,
	buildRuleDetachPermission,
	RuleAttachPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import type {
	LinkAccess,
	LinkPermissions,
} from 'lib/authz/hooks/useLinkPickerAccess/types';
import { useLinkPickerAccess } from 'lib/authz/hooks/useLinkPickerAccess/useLinkPickerAccess';

import { useCreateAlertState } from '../context';

export interface UseAlertRuleChannelAccessReturn {
	/** Whether a channel can be added or, if the saved rule has it, removed. */
	getChannelAccess: (channel: ChannelOption) => LinkAccess;
	/** Starts the `attach` checks on unsaved channels once the picker opens. */
	onPickerVisibleChange: (open: boolean) => void;
}

const buildChannelPermissions = (id: string): LinkPermissions => ({
	attach: buildNotificationChannelAttachPermission(id),
	detach: buildNotificationChannelDetachPermission(id),
});

/**
 * Mirrors the rule routes: a channel the rule gains needs `attach` on the rule
 * and the channel, one it loses `detach` on both. A new rule has no id, so its
 * `attach` is checked on the wildcard.
 */
export function useAlertRuleChannelAccess(
	channels: ChannelOption[],
): UseAlertRuleChannelAccessReturn {
	const { isEditMode, ruleId, savedChannels } = useCreateAlertState();
	const editedRuleId = isEditMode && ruleId ? ruleId : undefined;

	const owner = useMemo<LinkPermissions>(
		() =>
			editedRuleId
				? {
						attach: buildRuleAttachPermission(editedRuleId),
						detach: buildRuleDetachPermission(editedRuleId),
					}
				: {
						attach: RuleAttachPermission,
						detach: buildRuleDetachPermission('*'),
					},
		[editedRuleId],
	);

	// The rule names its channels; permissions are keyed by channel id.
	const linkedIds = useMemo(() => {
		const saved = new Set(savedChannels);
		return channels.filter((c) => saved.has(c.name)).map((c) => c.id);
	}, [savedChannels, channels]);
	const optionIds = useMemo(() => channels.map((c) => c.id), [channels]);

	const { getAccess, onPickerVisibleChange } = useLinkPickerAccess({
		owner,
		linkedIds,
		optionIds,
		buildItemPermissions: buildChannelPermissions,
	});

	const getChannelAccess = useCallback(
		(channel: ChannelOption): LinkAccess => getAccess(channel.id),
		[getAccess],
	);

	return { getChannelAccess, onPickerVisibleChange };
}
