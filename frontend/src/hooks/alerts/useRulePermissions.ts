import { useMemo } from 'react';
import {
	buildRuleAttachPermission,
	buildRuleDeletePermission,
	buildRuleDetachPermission,
	buildRuleReadPermission,
	buildRuleUpdatePermission,
	RuleCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

export interface RulePermissions {
	canRead: boolean;
	canUpdate: boolean;
	canDelete: boolean;
	/** Per the authz guide, an edit affordance needs `read` as well as `update`. */
	canEdit: boolean;
	/** Clone reads this rule and creates a new one. */
	canClone: boolean;
	canAttach: boolean;
	canDetach: boolean;
	isLoading: boolean;
	/** The check failed: callers fall open and let the API decide. */
	hasError: boolean;
	readPermission: BrandedPermission;
	updatePermission: BrandedPermission;
	deletePermission: BrandedPermission;
	attachPermission: BrandedPermission;
	detachPermission: BrandedPermission;
	/** `[read, update]`, so a denial names both. */
	editChecks: BrandedPermission[];
	/** `[read, create]`, so a denial names both. */
	cloneChecks: BrandedPermission[];
}

/** Pass `enabled: false` while the id is unknown, so no check fires against an empty selector. */
export function useRulePermissions(
	ruleId: string,
	options?: { enabled?: boolean },
): RulePermissions {
	const enabled = options?.enabled ?? true;

	const {
		readPermission,
		updatePermission,
		deletePermission,
		attachPermission,
		detachPermission,
	} = useMemo(
		() => ({
			readPermission: buildRuleReadPermission(ruleId),
			updatePermission: buildRuleUpdatePermission(ruleId),
			deletePermission: buildRuleDeletePermission(ruleId),
			attachPermission: buildRuleAttachPermission(ruleId),
			detachPermission: buildRuleDetachPermission(ruleId),
		}),
		[ruleId],
	);

	const checks = useMemo(
		() => [
			readPermission,
			updatePermission,
			deletePermission,
			attachPermission,
			detachPermission,
			RuleCreatePermission,
		],
		[
			readPermission,
			updatePermission,
			deletePermission,
			attachPermission,
			detachPermission,
		],
	);

	const { isGranted, isLoading, error } = useAuthZ(checks, { enabled });

	const canRead = isGranted(readPermission);

	const editChecks = useMemo(
		() => [readPermission, updatePermission],
		[readPermission, updatePermission],
	);

	const cloneChecks = useMemo(
		() => [readPermission, RuleCreatePermission],
		[readPermission],
	);

	return {
		canRead,
		canUpdate: isGranted(updatePermission),
		canDelete: isGranted(deletePermission),
		canEdit: canRead && isGranted(updatePermission),
		canClone: canRead && isGranted(RuleCreatePermission),
		canAttach: isGranted(attachPermission),
		canDetach: isGranted(detachPermission),
		isLoading,
		hasError: !!error,
		readPermission,
		updatePermission,
		deletePermission,
		attachPermission,
		detachPermission,
		editChecks,
		cloneChecks,
	};
}
