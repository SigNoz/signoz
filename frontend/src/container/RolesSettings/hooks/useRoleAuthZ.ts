import { useMemo } from 'react';
import {
	buildRoleDeletePermission,
	buildRoleReadPermission,
	buildRoleUpdatePermission,
	RoleCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/role.permissions';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import {
	ParsedPermissionObject,
	parsePermission,
} from 'lib/authz/hooks/useAuthZ/utils';

interface UseRoleAuthZResult {
	readRolePermission: ParsedPermissionObject;
	updateRolePermission: ParsedPermissionObject;
	deleteRolePermission: ParsedPermissionObject;
	hasCreatePermission: boolean;
	hasReadPermission: boolean;
	hasUpdatePermission: boolean;
	hasDeletePermission: boolean;
	isAuthZLoading: boolean;
}

export function useRoleAuthZ(roleName: string): UseRoleAuthZResult {
	const readRolePermissionName = buildRoleReadPermission(roleName);
	const updateRolePermissionName = buildRoleUpdatePermission(roleName);
	const deleteRolePermissionName = buildRoleDeletePermission(roleName);

	const permissionsToCheck = useMemo(() => {
		const perms = [RoleCreatePermission];
		if (roleName) {
			perms.push(
				readRolePermissionName,
				updateRolePermissionName,
				deleteRolePermissionName,
			);
		}
		return perms;
	}, [
		roleName,
		readRolePermissionName,
		updateRolePermissionName,
		deleteRolePermissionName,
	]);

	const { permissions, isLoading: isAuthZLoading } =
		useAuthZ(permissionsToCheck);

	const hasCreatePermission = useMemo(() => {
		if (permissions === null) {
			return false;
		}
		return permissions[RoleCreatePermission]?.isGranted ?? false;
	}, [permissions]);

	const hasReadPermission = useMemo(() => {
		if (!roleName || permissions === null) {
			return true;
		}
		return permissions[buildRoleReadPermission(roleName)]?.isGranted ?? true;
	}, [permissions, roleName]);

	const hasUpdatePermission = useMemo(() => {
		if (!roleName || permissions === null) {
			return true;
		}
		return permissions[buildRoleUpdatePermission(roleName)]?.isGranted ?? true;
	}, [permissions, roleName]);

	const hasDeletePermission = useMemo(() => {
		if (!roleName || permissions === null) {
			return true;
		}
		return permissions[buildRoleDeletePermission(roleName)]?.isGranted ?? true;
	}, [permissions, roleName]);

	return {
		readRolePermission: parsePermission(readRolePermissionName),
		updateRolePermission: parsePermission(updateRolePermissionName),
		deleteRolePermission: parsePermission(deleteRolePermissionName),
		hasCreatePermission,
		hasReadPermission,
		hasUpdatePermission,
		hasDeletePermission,
		isAuthZLoading,
	};
}
