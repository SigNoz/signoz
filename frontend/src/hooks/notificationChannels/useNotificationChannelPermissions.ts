import { useMemo } from 'react';
import {
	buildNotificationChannelDeletePermission,
	buildNotificationChannelReadPermission,
	buildNotificationChannelUpdatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

export interface NotificationChannelPermissions {
	canRead: boolean;
	canUpdate: boolean;
	canDelete: boolean;
	/** Per the authz guide, an edit affordance needs `read` as well as `update`. */
	canEdit: boolean;
	isLoading: boolean;
	readPermission: BrandedPermission;
	updatePermission: BrandedPermission;
	deletePermission: BrandedPermission;
	/** `[read, update]`, so a denial names both. */
	editChecks: BrandedPermission[];
}

/**
 * Resource-level notification channel permissions. Pass `enabled: false` while
 * the id is unknown, so no check fires against an empty selector.
 */
export function useNotificationChannelPermissions(
	channelId: string,
	options?: { enabled?: boolean },
): NotificationChannelPermissions {
	const enabled = options?.enabled ?? true;

	const { readPermission, updatePermission, deletePermission } = useMemo(
		() => ({
			readPermission: buildNotificationChannelReadPermission(channelId),
			updatePermission: buildNotificationChannelUpdatePermission(channelId),
			deletePermission: buildNotificationChannelDeletePermission(channelId),
		}),
		[channelId],
	);

	const checks = useMemo(
		() => [readPermission, updatePermission, deletePermission],
		[readPermission, updatePermission, deletePermission],
	);

	const { isGranted, isLoading } = useAuthZ(checks, { enabled });

	const canRead = isGranted(readPermission);
	const canUpdate = isGranted(updatePermission);

	const editChecks = useMemo(
		() => [readPermission, updatePermission],
		[readPermission, updatePermission],
	);

	return {
		canRead,
		canUpdate,
		canDelete: isGranted(deletePermission),
		canEdit: canRead && canUpdate,
		isLoading,
		readPermission,
		updatePermission,
		deletePermission,
		editChecks,
	};
}
