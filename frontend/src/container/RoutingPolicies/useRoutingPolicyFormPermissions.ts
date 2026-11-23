import { useCallback, useMemo } from 'react';
import type { ChannelOption } from 'hooks/notificationChannels/useChannelOptions';
import {
	buildNotificationChannelAttachPermission,
	buildNotificationChannelDetachPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import {
	buildRoutePolicyAttachPermission,
	buildRoutePolicyDetachPermission,
	buildRoutePolicyUpdatePermission,
	RoutePolicyCreateChecks,
} from 'lib/authz/hooks/useAuthZ/permissions/route-policy.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import type {
	LinkAccess,
	LinkPermissions,
} from 'lib/authz/hooks/useLinkPickerAccess/types';
import { useLinkPickerAccess } from 'lib/authz/hooks/useLinkPickerAccess/useLinkPickerAccess';

import { PolicyDetailsModalMode, RoutingPolicy } from './types';

export interface UseRoutingPolicyFormPermissionsReturn {
	/** Editing a policy the user may not update. */
	isReadOnly: boolean;
	saveChecks: BrandedPermission[];
	/** Whether a channel can be added or, if the policy already has it, removed. */
	getChannelAccess: (channel: ChannelOption) => LinkAccess;
	/** Starts the `attach` checks on unlinked channels once the picker opens. */
	onPickerVisibleChange: (open: boolean) => void;
}

const buildChannelPermissions = (id: string): LinkPermissions => ({
	attach: buildNotificationChannelAttachPermission(id),
	detach: buildNotificationChannelDetachPermission(id),
});

/**
 * Mirrors the route policy routes: create needs `create` and `attach` on every
 * policy; an edit needs `update`, and `attach`/`detach` on both the policy and
 * each channel it gains or loses.
 */
export function useRoutingPolicyFormPermissions(
	mode: PolicyDetailsModalMode,
	routingPolicy: RoutingPolicy | null,
	channels: ChannelOption[],
): UseRoutingPolicyFormPermissionsReturn {
	const policyId = mode === 'edit' ? routingPolicy?.id : undefined;

	const update = useMemo(
		() => (policyId ? buildRoutePolicyUpdatePermission(policyId) : undefined),
		[policyId],
	);
	const owner = useMemo(
		() =>
			policyId
				? {
						attach: buildRoutePolicyAttachPermission(policyId),
						detach: buildRoutePolicyDetachPermission(policyId),
					}
				: undefined,
		[policyId],
	);
	const ownerChecks = useMemo(() => (update ? [update] : []), [update]);

	// The policy names its channels; permissions are keyed by channel id.
	const linkedIds = useMemo(() => {
		const linkedNames = new Set(policyId ? (routingPolicy?.channels ?? []) : []);
		return channels.filter((c) => linkedNames.has(c.name)).map((c) => c.id);
	}, [policyId, routingPolicy?.channels, channels]);
	const optionIds = useMemo(() => channels.map((c) => c.id), [channels]);

	const { getAccess, onPickerVisibleChange, isOwnerDenied } =
		useLinkPickerAccess({
			owner,
			ownerChecks,
			linkedIds,
			optionIds,
			buildItemPermissions: buildChannelPermissions,
		});

	const getChannelAccess = useCallback(
		(channel: ChannelOption): LinkAccess => getAccess(channel.id),
		[getAccess],
	);

	const saveChecks = useMemo(
		() => (update ? [update] : RoutePolicyCreateChecks),
		[update],
	);

	return {
		isReadOnly: !!update && isOwnerDenied(update),
		saveChecks,
		getChannelAccess,
		onPickerVisibleChange,
	};
}
