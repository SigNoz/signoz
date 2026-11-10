import { useMemo } from 'react';
import type { ResourcePermissions } from '../types';

export interface RoleFormData {
	name: string;
	description: string;
}

interface RolePermissionsData {
	roleName: string;
	roleDescription: string;
	resources: ResourcePermissions[];
}

export function useRoleUnsavedChanges(
	isCreateMode: boolean,
	formData: RoleFormData,
	localResources: ResourcePermissions[],
	rolePermissionsData: RolePermissionsData | undefined,
	emptyResources: ResourcePermissions[],
): boolean {
	return useMemo(() => {
		if (isCreateMode) {
			return (
				formData.name.trim() !== '' ||
				formData.description.trim() !== '' ||
				JSON.stringify(localResources) !== JSON.stringify(emptyResources)
			);
		}

		if (!rolePermissionsData) {
			return false;
		}

		const nameChanged = formData.name !== rolePermissionsData.roleName;
		const descriptionChanged =
			formData.description !== rolePermissionsData.roleDescription;
		const resourcesChanged =
			JSON.stringify(localResources) !==
			JSON.stringify(rolePermissionsData.resources);

		return nameChanged || descriptionChanged || resourcesChanged;
	}, [
		isCreateMode,
		formData,
		localResources,
		rolePermissionsData,
		emptyResources,
	]);
}
