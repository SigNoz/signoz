import {
	RuleCreatePermission,
	RuleListPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

export interface RuleCollectionPermissions {
	canList: boolean;
	canCreate: boolean;
	isLoading: boolean;
	/**
	 * The check itself failed. Callers should fall open (behave as before authz
	 * and let the API decide) rather than treat an outage as a denial.
	 */
	hasError: boolean;
}

// Module-level so the useQueries identity stays stable across renders.
const CHECKS = [RuleListPermission, RuleCreatePermission];

/** Collection-level rule permissions (wildcard selector). */
export function useRuleCollectionPermissions(): RuleCollectionPermissions {
	const { isGranted, isLoading, error } = useAuthZ(CHECKS);

	return {
		canList: isGranted(RuleListPermission),
		canCreate: isGranted(RuleCreatePermission),
		isLoading,
		hasError: !!error,
	};
}
