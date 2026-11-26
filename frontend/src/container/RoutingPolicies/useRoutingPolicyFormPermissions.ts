import { useMemo } from 'react';
import type { ChannelOption } from 'hooks/notificationChannels/useChannelOptions';
import { useChannelPickerAccess } from 'hooks/notificationChannels/useChannelPickerAccess';
import type { AuthZSelectOption } from 'lib/authz/components/AuthZSelect/types';
import {
	buildRoutePolicyAttachPermission,
	buildRoutePolicyDetachPermission,
	buildRoutePolicyUpdatePermission,
	RoutePolicyCreateChecks,
} from 'lib/authz/hooks/useAuthZ/permissions/route-policy.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

import { PolicyDetailsModalMode, RoutingPolicy } from './types';

export interface UseRoutingPolicyFormPermissionsReturn {
	/** Editing a policy the user may not update. */
	isReadOnly: boolean;
	saveChecks: BrandedPermission[];
	/** The picker's options, each disabled with the reason when locked. */
	channelOptions: AuthZSelectOption[];
	/** Starts the `attach` checks on unlinked channels once the picker opens. */
	onPickerVisibleChange: (open: boolean) => void;
}

const NO_CHANNELS: string[] = [];

/**
 * Mirrors the route policy routes: create needs `create` and `attach` on every
 * policy, checked on Save; an edit needs `update`, and `attach`/`detach` on both
 * the policy and each channel it gains or loses.
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

	const {
		options: channelOptions,
		onPickerVisibleChange,
		isOwnerDenied,
	} = useChannelPickerAccess({
		owner,
		ownerChecks,
		savedChannelNames: policyId
			? (routingPolicy?.channels ?? NO_CHANNELS)
			: NO_CHANNELS,
		channels,
		testIdPrefix: 'routing-policy-channel-option',
	});

	const saveChecks = useMemo(
		() => (update ? [update] : RoutePolicyCreateChecks),
		[update],
	);

	return {
		isReadOnly: !!update && isOwnerDenied(update),
		saveChecks,
		channelOptions,
		onPickerVisibleChange,
	};
}
