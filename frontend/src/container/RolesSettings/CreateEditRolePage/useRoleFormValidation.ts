import { useCallback, useState } from 'react';
import { PermissionScope, ResourcePermissions } from '../types';

interface UseRoleFormValidationResult {
	validationErrors: Set<string>;
	validateResources: (resources: ResourcePermissions[]) => string | null;
	clearValidationErrors: () => void;
}

export function useRoleFormValidation(): UseRoleFormValidationResult {
	const [validationErrors, setValidationErrors] = useState<Set<string>>(
		() => new Set(),
	);

	const validateResources = useCallback(
		(resources: ResourcePermissions[]): string | null => {
			const errors = new Set<string>();

			for (const resource of resources) {
				for (const [action, config] of Object.entries(resource.actions)) {
					if (
						config?.scope === PermissionScope.ONLY_SELECTED &&
						config.selectedIds.length === 0
					) {
						errors.add(`${resource.resourceId}:${action}`);
					}
				}
			}

			if (errors.size > 0) {
				setValidationErrors(errors);
				return 'Please add at least one selector for each "Only selected" permission.';
			}

			setValidationErrors(new Set());
			return null;
		},
		[],
	);

	const clearValidationErrors = useCallback((): void => {
		setValidationErrors(new Set());
	}, []);

	return {
		validationErrors,
		validateResources,
		clearValidationErrors,
	};
}
