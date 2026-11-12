import { useCallback, useMemo } from 'react';
import type { ChannelOption } from 'hooks/notificationChannels/useChannelOptions';
import { formatDeniedMessage } from 'lib/authz/components/formatDeniedMessage';
import {
	buildNotificationChannelAttachPermission,
	buildNotificationChannelDetachPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import {
	buildRoutePolicyAttachPermission,
	buildRoutePolicyDetachPermission,
	buildRoutePolicyReadPermission,
	buildRoutePolicyUpdatePermission,
	RoutePolicyCreateChecks,
} from 'lib/authz/hooks/useAuthZ/permissions/route-policy.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { useAppContext } from 'providers/App/App';

import { PolicyDetailsModalMode, RoutingPolicy } from './types';

export interface RoutingPolicyFormPermissions {
	/** Editing a policy the user may read but not update. */
	isReadOnly: boolean;
	saveChecks: BrandedPermission[];
	/** Why a channel cannot be added or, if the policy already has it, removed. */
	getChannelDenial: (channel: ChannelOption) => string | undefined;
}

/**
 * Mirrors the route policy routes: create needs `create` and `attach` on every
 * policy; an edit needs `update`, and `attach`/`detach` on both the policy and
 * each channel it gains or loses. Only those checks are run: a linked channel
 * is asked for `detach`, an unlinked one for `attach`.
 */
export function useRoutingPolicyFormPermissions(
	mode: PolicyDetailsModalMode,
	routingPolicy: RoutingPolicy | null,
	channels: ChannelOption[],
): RoutingPolicyFormPermissions {
	const { user } = useAppContext();
	const policyId = mode === 'edit' ? routingPolicy?.id : undefined;

	const linkedNames = useMemo(
		() => new Set(policyId ? (routingPolicy?.channels ?? []) : []),
		[policyId, routingPolicy?.channels],
	);

	const policyChecks = useMemo(
		() =>
			policyId
				? {
						read: buildRoutePolicyReadPermission(policyId),
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

	const checks = useMemo(
		() => [
			...(policyChecks ? Object.values(policyChecks) : []),
			...channels.map(channelCheck),
		],
		[policyChecks, channels, channelCheck],
	);

	const { isGranted, isLoading, error } = useAuthZ(checks, {
		enabled: checks.length > 0,
	});
	const isResolved = !isLoading && !error;

	const getChannelDenial = useCallback(
		(channel: ChannelOption): string | undefined => {
			if (!isResolved) {
				return undefined;
			}

			const policyCheck = linkedNames.has(channel.name)
				? policyChecks?.detach
				: policyChecks?.attach;
			const denied = [policyCheck, channelCheck(channel)].filter(
				(permission): permission is BrandedPermission =>
					!!permission && !isGranted(permission),
			);

			return denied.length > 0 ? formatDeniedMessage(denied, user.id) : undefined;
		},
		[isResolved, linkedNames, policyChecks, channelCheck, isGranted, user.id],
	);

	const saveChecks = useMemo(
		() =>
			policyChecks
				? [policyChecks.read, policyChecks.update]
				: RoutePolicyCreateChecks,
		[policyChecks],
	);

	return {
		isReadOnly:
			!!policyChecks &&
			isResolved &&
			!(isGranted(policyChecks.read) && isGranted(policyChecks.update)),
		saveChecks,
		getChannelDenial,
	};
}
