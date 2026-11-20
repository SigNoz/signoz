import { useCallback, useMemo, useState } from 'react';
import type { ChannelOption } from 'hooks/notificationChannels/useChannelOptions';
import { AUTHZ_LOADING_TOOLTIP } from 'lib/authz/components/constants';
import { formatDeniedMessage } from 'lib/authz/components/formatDeniedMessage';
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
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { useAppContext } from 'providers/App/App';

import { PolicyDetailsModalMode, RoutingPolicy } from './types';

export interface ChannelAccess {
	disabled: boolean;
	/** The denial, or that the check is still running. */
	reason?: string;
}

export interface UseRoutingPolicyFormPermissionsReturn {
	/** Editing a policy the user may not update. */
	isReadOnly: boolean;
	saveChecks: BrandedPermission[];
	/** Whether a channel can be added or, if the policy already has it, removed. */
	getChannelAccess: (channel: ChannelOption) => ChannelAccess;
	/** Starts the `attach` checks on unlinked channels. */
	onPickerOpen: () => void;
}

const ALLOWED: ChannelAccess = { disabled: false };
const PENDING: ChannelAccess = {
	disabled: true,
	reason: AUTHZ_LOADING_TOOLTIP,
};

/**
 * Mirrors the route policy routes: create needs `create` and `attach` on every
 * policy; an edit needs `update`, and `attach`/`detach` on both the policy and
 * each channel it gains or loses. A linked channel is asked for `detach` up
 * front, since its tag can be removed without opening the picker; every other
 * channel is asked for `attach` once the picker opens.
 */
export function useRoutingPolicyFormPermissions(
	mode: PolicyDetailsModalMode,
	routingPolicy: RoutingPolicy | null,
	channels: ChannelOption[],
): UseRoutingPolicyFormPermissionsReturn {
	const { user } = useAppContext();
	const [hasPickerOpened, setHasPickerOpened] = useState(false);
	const policyId = mode === 'edit' ? routingPolicy?.id : undefined;

	const linkedNames = useMemo(
		() => new Set(policyId ? (routingPolicy?.channels ?? []) : []),
		[policyId, routingPolicy?.channels],
	);

	const policyChecks = useMemo(
		() =>
			policyId
				? {
						update: buildRoutePolicyUpdatePermission(policyId),
						attach: buildRoutePolicyAttachPermission(policyId),
						detach: buildRoutePolicyDetachPermission(policyId),
					}
				: undefined,
		[policyId],
	);

	const channelCheck = useCallback(
		(channel: ChannelOption): BrandedPermission =>
			linkedNames.has(channel.name)
				? buildNotificationChannelDetachPermission(channel.id)
				: buildNotificationChannelAttachPermission(channel.id),
		[linkedNames],
	);

	const upfrontChecks = useMemo(
		() => [
			...(policyChecks ? Object.values(policyChecks) : []),
			...channels.filter((c) => linkedNames.has(c.name)).map(channelCheck),
		],
		[policyChecks, channels, linkedNames, channelCheck],
	);
	const pickerChecks = useMemo(
		() => channels.filter((c) => !linkedNames.has(c.name)).map(channelCheck),
		[channels, linkedNames, channelCheck],
	);

	const upfront = useAuthZ(upfrontChecks, {
		enabled: upfrontChecks.length > 0,
	});
	const picker = useAuthZ(pickerChecks, {
		enabled: hasPickerOpened && pickerChecks.length > 0,
	});

	const getChannelAccess = useCallback(
		(channel: ChannelOption): ChannelAccess => {
			if (upfront.error || picker.error) {
				return ALLOWED;
			}

			const policyCheck = linkedNames.has(channel.name)
				? policyChecks?.detach
				: policyChecks?.attach;
			const required = [policyCheck, channelCheck(channel)].filter(
				(permission): permission is BrandedPermission => !!permission,
			);
			const results = { ...upfront.permissions, ...picker.permissions };
			// A check reports loading only once its fetch starts, a render after the
			// picker opens; a missing result keeps the option from flashing enabled.
			if (required.some((permission) => !results[permission])) {
				return PENDING;
			}

			const denied = required.filter(
				(permission) => !results[permission].isGranted,
			);
			return denied.length > 0
				? { disabled: true, reason: formatDeniedMessage(denied, user.id) }
				: ALLOWED;
		},
		[
			upfront.error,
			upfront.permissions,
			picker.error,
			picker.permissions,
			linkedNames,
			policyChecks,
			channelCheck,
			user.id,
		],
	);

	const onPickerOpen = useCallback(() => setHasPickerOpened(true), []);

	const saveChecks = useMemo(
		() => (policyChecks ? [policyChecks.update] : RoutePolicyCreateChecks),
		[policyChecks],
	);

	return {
		isReadOnly:
			!!policyChecks &&
			!upfront.isLoading &&
			!upfront.error &&
			!upfront.isGranted(policyChecks.update),
		saveChecks,
		getChannelAccess,
		onPickerOpen,
	};
}
