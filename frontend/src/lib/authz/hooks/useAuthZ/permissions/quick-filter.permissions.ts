import { buildPermission } from '../utils';

export const QuickFilterReadPermission = buildPermission(
	'read',
	'quick-filter:*',
);
export const QuickFilterUpdatePermission = buildPermission(
	'update',
	'quick-filter:*',
);

// Editing quick filters needs read as well as update
export const QuickFilterManagePermissions = [
	QuickFilterReadPermission,
	QuickFilterUpdatePermission,
];
