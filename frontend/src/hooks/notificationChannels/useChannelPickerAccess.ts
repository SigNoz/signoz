import { useMemo } from 'react';
import {
	buildNotificationChannelAttachPermission,
	buildNotificationChannelDetachPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import type { LinkPermissions } from 'lib/authz/hooks/useLinkPickerAccess/types';
import { useLinkPickerAccess } from 'lib/authz/hooks/useLinkPickerAccess/useLinkPickerAccess';

import type { ChannelOption } from './useChannelOptions';

export interface ChannelPickerOption {
	value: string;
	label: string;
	disabled: boolean;
	/** The denial, that the check is still running, or the channel's name. */
	title: string;
	'aria-disabled': boolean;
	'data-testid': string;
}

interface UseChannelPickerAccessArgs {
	/** The `attach`/`detach` of the rule or policy being edited; absent when new. */
	owner?: LinkPermissions;
	/** Asked with the saved channels, e.g. the owner's `update`. */
	ownerChecks?: BrandedPermission[];
	/** Channels the saved owner notifies, by name. */
	savedChannelNames: string[];
	channels: ChannelOption[];
	/** Each option's test id is `<prefix>-<channel id>`. */
	testIdPrefix: string;
}

export interface UseChannelPickerAccessReturn {
	options: ChannelPickerOption[];
	/** Starts the `attach` checks on unsaved channels once the picker opens. */
	onPickerVisibleChange: (open: boolean) => void;
	/** Whether an owner check is denied; false while pending or failed. */
	isOwnerDenied: (permission: BrandedPermission) => boolean;
}

const buildChannelPermissions = (id: string): LinkPermissions => ({
	attach: buildNotificationChannelAttachPermission(id),
	detach: buildNotificationChannelDetachPermission(id),
});

/**
 * The options of a channel picker, each disabled with the reason when the
 * channel cannot be added or, if saved, removed. Owners name their channels;
 * permissions are keyed by channel id.
 */
export function useChannelPickerAccess({
	owner,
	ownerChecks,
	savedChannelNames,
	channels,
	testIdPrefix,
}: UseChannelPickerAccessArgs): UseChannelPickerAccessReturn {
	const linkedIds = useMemo(() => {
		const saved = new Set(savedChannelNames);
		return channels.filter((c) => saved.has(c.name)).map((c) => c.id);
	}, [savedChannelNames, channels]);
	const optionIds = useMemo(() => channels.map((c) => c.id), [channels]);

	const { getAccess, onPickerVisibleChange, isOwnerDenied } =
		useLinkPickerAccess({
			owner,
			ownerChecks,
			linkedIds,
			optionIds,
			buildItemPermissions: buildChannelPermissions,
		});

	const options = useMemo(
		() =>
			channels.map((channel): ChannelPickerOption => {
				const { disabled, reason } = getAccess(channel.id);
				return {
					value: channel.name,
					label: channel.name,
					disabled,
					title: reason ?? channel.name,
					'aria-disabled': disabled,
					'data-testid': `${testIdPrefix}-${channel.id}`,
				};
			}),
		[channels, getAccess, testIdPrefix],
	);

	return { options, onPickerVisibleChange, isOwnerDenied };
}
