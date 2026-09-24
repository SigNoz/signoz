import {
	NotificationChannelCreatePermission,
	NotificationChannelListPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

export interface NotificationChannelCollectionPermissions {
	canList: boolean;
	canCreate: boolean;
	/** A test send is gated on `create` against the wildcard. */
	canTest: boolean;
	isLoading: boolean;
	/**
	 * The check itself failed. Callers should fall open (behave as before authz
	 * and let the API decide) rather than treat an outage as a denial.
	 */
	hasError: boolean;
}

// Module-level so the useQueries identity stays stable across renders.
const CHECKS = [
	NotificationChannelListPermission,
	NotificationChannelCreatePermission,
];

/** Collection-level notification channel permissions (wildcard selector). */
export function useNotificationChannelCollectionPermissions(): NotificationChannelCollectionPermissions {
	const { isGranted, isLoading, error } = useAuthZ(CHECKS);

	const canCreate = isGranted(NotificationChannelCreatePermission);

	return {
		canList: isGranted(NotificationChannelListPermission),
		canCreate,
		canTest: canCreate,
		isLoading,
		hasError: !!error,
	};
}
