import { type ReactNode, useMemo } from 'react';
import { AUTHZ_LOADING_TOOLTIP } from 'lib/authz/components/constants';
import { deniedTooltip } from 'lib/authz/components/deniedTooltip';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { useAppContext } from 'providers/App/App';

export interface UseAuthZDisabledReturn {
	disabled: boolean;
	disabledTooltip: ReactNode;
}

// The tooltip only shows while disabled. Unsetting it when allowed would
// remount the control outside its tooltip and drop focus.
const ALLOWED: UseAuthZDisabledReturn = {
	disabled: false,
	disabledTooltip: AUTHZ_LOADING_TOOLTIP,
};

/**
 * `disabled` and `disabledTooltip` for a `@signozhq/ui` control that needs
 * `checks`: locked while the check runs and when it denies, open when the check
 * itself fails.
 */
export function useAuthZDisabled(
	checks: BrandedPermission[],
): UseAuthZDisabledReturn {
	const { user } = useAppContext();
	const { permissions, isLoading, error } = useAuthZ(checks);

	return useMemo(() => {
		if (isLoading) {
			return { disabled: true, disabledTooltip: AUTHZ_LOADING_TOOLTIP };
		}
		const denied =
			error || !permissions
				? []
				: checks.filter((check) => permissions[check]?.isGranted === false);
		return denied.length > 0
			? { disabled: true, disabledTooltip: deniedTooltip(denied, user.id) }
			: ALLOWED;
	}, [isLoading, error, permissions, checks, user.id]);
}
