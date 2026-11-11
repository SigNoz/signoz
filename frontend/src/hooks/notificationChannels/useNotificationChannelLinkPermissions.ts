import { useCallback, useMemo } from 'react';
import {
	buildNotificationChannelAttachPermission,
	buildNotificationChannelDetachPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

export interface NotificationChannelLinkPermissions {
	canAttach: (channelId: string) => boolean;
	canDetach: (channelId: string) => boolean;
	isLoading: boolean;
	/** The check failed: callers fall open and let the API decide. */
	hasError: boolean;
}

/**
 * Whether the user may link (`attach`) or unlink (`detach`) each channel, as a
 * channel picker on a rule or a routing policy needs.
 */
export function useNotificationChannelLinkPermissions(
	channelIds: string[],
	options?: { enabled?: boolean },
): NotificationChannelLinkPermissions {
	const enabled = options?.enabled ?? true;

	const checks = useMemo<BrandedPermission[]>(
		() =>
			channelIds.flatMap((id) => [
				buildNotificationChannelAttachPermission(id),
				buildNotificationChannelDetachPermission(id),
			]),
		[channelIds],
	);

	const { isGranted, isLoading, error } = useAuthZ(checks, {
		enabled: enabled && checks.length > 0,
	});

	const canAttach = useCallback(
		(channelId: string): boolean =>
			isGranted(buildNotificationChannelAttachPermission(channelId)),
		[isGranted],
	);
	const canDetach = useCallback(
		(channelId: string): boolean =>
			isGranted(buildNotificationChannelDetachPermission(channelId)),
		[isGranted],
	);

	return { canAttach, canDetach, isLoading, hasError: !!error };
}
