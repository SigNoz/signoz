import { useMemo } from 'react';

import { PermissionScope, ResourcePermissions } from '../types';

export function useRoleGrantedCount(
	resource: Pick<ResourcePermissions, 'availableActions' | 'actions'>,
): [grantedCount: number, totalCount: number] {
	return useMemo(() => {
		const granted = resource.availableActions.filter((actionName) => {
			const config = resource.actions[actionName];
			return !!config && config.scope !== PermissionScope.NONE;
		});

		return [granted.length, resource.availableActions.length];
	}, [resource.availableActions, resource.actions]);
}
