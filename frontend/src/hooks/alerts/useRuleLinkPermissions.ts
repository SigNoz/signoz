import { useCallback, useMemo } from 'react';
import {
	buildRuleAttachPermission,
	buildRuleDetachPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

export interface RuleLinkPermissions {
	canAttach: (ruleId: string) => boolean;
	canDetach: (ruleId: string) => boolean;
	isLoading: boolean;
	/** The check failed: callers fall open and let the API decide. */
	hasError: boolean;
}

/**
 * Whether the user may link (`attach`) or unlink (`detach`) each alert rule, as a
 * rule picker on a planned downtime needs.
 */
export function useRuleLinkPermissions(
	ruleIds: string[],
	options?: { enabled?: boolean },
): RuleLinkPermissions {
	const enabled = options?.enabled ?? true;

	const checks = useMemo<BrandedPermission[]>(
		() =>
			ruleIds.flatMap((id) => [
				buildRuleAttachPermission(id),
				buildRuleDetachPermission(id),
			]),
		[ruleIds],
	);

	const { isGranted, isLoading, error } = useAuthZ(checks, {
		enabled: enabled && checks.length > 0,
	});

	const canAttach = useCallback(
		(ruleId: string): boolean => isGranted(buildRuleAttachPermission(ruleId)),
		[isGranted],
	);
	const canDetach = useCallback(
		(ruleId: string): boolean => isGranted(buildRuleDetachPermission(ruleId)),
		[isGranted],
	);

	return { canAttach, canDetach, isLoading, hasError: !!error };
}
