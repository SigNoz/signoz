import { useCallback, useMemo } from 'react';
import type { ChannelOption } from 'hooks/notificationChannels/useChannelOptions';
import { useNotificationChannelLinkPermissions } from 'hooks/notificationChannels/useNotificationChannelLinkPermissions';
import {
	buildNotificationChannelAttachPermission,
	buildNotificationChannelDetachPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import { ROUTE_POLICY_CREATE_CHECKS } from 'hooks/routingPolicies/useRoutePolicyCollectionPermissions';
import { useRoutePolicyPermissions } from 'hooks/routingPolicies/useRoutePolicyPermissions';
import { formatDeniedMessage } from 'lib/authz/components/formatDeniedMessage';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
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
 * each channel it gains or loses.
 */
export function useRoutingPolicyFormPermissions(
	mode: PolicyDetailsModalMode,
	routingPolicy: RoutingPolicy | null,
	channels: ChannelOption[],
): RoutingPolicyFormPermissions {
	const { user } = useAppContext();
	const isEdit = mode === 'edit' && !!routingPolicy?.id;

	const policy = useRoutePolicyPermissions(routingPolicy?.id ?? '', {
		enabled: isEdit,
	});

	const channelIds = useMemo(() => channels.map((c) => c.id), [channels]);
	const link = useNotificationChannelLinkPermissions(channelIds);

	const linkedNames = useMemo(
		() => new Set(isEdit ? (routingPolicy?.channels ?? []) : []),
		[isEdit, routingPolicy?.channels],
	);

	const isPolicyResolved = !isEdit || (!policy.isLoading && !policy.hasError);
	const isLinkResolved = !link.isLoading && !link.hasError;

	const getChannelDenial = useCallback(
		(channel: ChannelOption): string | undefined => {
			if (!isPolicyResolved || !isLinkResolved) {
				return undefined;
			}

			const isLinked = linkedNames.has(channel.name);
			const denied: BrandedPermission[] = [];

			if (isLinked) {
				if (isEdit && !policy.canDetach) {
					denied.push(policy.detachPermission);
				}
				if (!link.canDetach(channel.id)) {
					denied.push(buildNotificationChannelDetachPermission(channel.id));
				}
			} else {
				if (isEdit && !policy.canAttach) {
					denied.push(policy.attachPermission);
				}
				if (!link.canAttach(channel.id)) {
					denied.push(buildNotificationChannelAttachPermission(channel.id));
				}
			}

			return denied.length > 0 ? formatDeniedMessage(denied, user.id) : undefined;
		},
		[
			isPolicyResolved,
			isLinkResolved,
			linkedNames,
			isEdit,
			policy,
			link,
			user.id,
		],
	);

	return {
		isReadOnly: isEdit && isPolicyResolved && !policy.canEdit,
		saveChecks: isEdit ? policy.editChecks : ROUTE_POLICY_CREATE_CHECKS,
		getChannelDenial,
	};
}
