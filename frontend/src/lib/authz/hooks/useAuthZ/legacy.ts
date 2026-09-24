import { buildPermission } from './utils';

// TODO(H4ad): Remove frontend/src/container/RolesSettings/CreateEditRolePage/permissions.config.ts once this is removed

export const IsAdminPermission = buildPermission(
	'assignee',
	'role:signoz-admin',
);
export const IsEditorPermission = buildPermission(
	'assignee',
	'role:signoz-editor',
);
export const IsViewerPermission = buildPermission(
	'assignee',
	'role:signoz-viewer',
);
export const IsAnonymousPermission = buildPermission(
	'assignee',
	'role:signoz-anonymous',
);
