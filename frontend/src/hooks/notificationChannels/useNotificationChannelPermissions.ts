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
	canEdit: boolean;
	isLoading: boolean;
	/** The check failed: callers fall open and let the API decide. */
	hasError: boolean;
	readPermission: BrandedPermission;
	updatePermission: BrandedPermission;
	deletePermission: BrandedPermission;
	editChecks: BrandedPermission[];
}

/** Pass `enabled: false` while the id is unknown, so no check fires against an empty selector. */
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

	const { isGranted, isLoading, error } = useAuthZ(checks, { enabled });

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
		hasError: !!error,
		readPermission,
		updatePermission,
		deletePermission,
		editChecks,
	};
}
