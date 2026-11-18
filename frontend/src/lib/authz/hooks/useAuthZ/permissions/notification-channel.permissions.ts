import { buildPermission } from '../utils';
import type { BrandedPermission } from '../types';

// Collection-level. Wildcard selector required for correct response key matching.
export const NotificationChannelListPermission = buildPermission(
	'list',
	'notification-channel:*',
);
// The test endpoint is gated on `create` against the wildcard, since a test send
// persists nothing and the channel need not exist.
export const NotificationChannelCreatePermission = buildPermission(
	'create',
	'notification-channel:*',
);

// Resource-level. Requires a specific channel id.
export const buildNotificationChannelReadPermission = (
	id: string,
): BrandedPermission => buildPermission('read', `notification-channel:${id}`);
export const buildNotificationChannelUpdatePermission = (
	id: string,
): BrandedPermission => buildPermission('update', `notification-channel:${id}`);
export const buildNotificationChannelDeletePermission = (
	id: string,
): BrandedPermission => buildPermission('delete', `notification-channel:${id}`);
