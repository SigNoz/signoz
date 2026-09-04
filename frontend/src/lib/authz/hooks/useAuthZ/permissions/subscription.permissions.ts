import { buildPermission } from '../utils';

export const SubscriptionReadPermission = buildPermission(
	'read',
	'subscription:*',
);
export const SubscriptionCreatePermission = buildPermission(
	'create',
	'subscription:*',
);
export const SubscriptionUpdatePermission = buildPermission(
	'update',
	'subscription:*',
);
