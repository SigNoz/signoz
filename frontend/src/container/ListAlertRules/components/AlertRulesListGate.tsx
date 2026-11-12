import type { ReactNode } from 'react';
import PermissionDeniedCallout from 'lib/authz/components/PermissionDeniedCallout/PermissionDeniedCallout';
import { RuleListPermission } from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

const LIST_CHECKS = [RuleListPermission];

interface AlertRulesListGateProps {
	className?: string;
	children: ReactNode;
}

/**
 * Swaps the list for a permission callout once `rule:list` is denied. Unlike
 * `AuthZGuardContent` it renders the list while the check is pending, so the
 * table mounts with the page and its URL state settles as before.
 */
function AlertRulesListGate({
	className,
	children,
}: AlertRulesListGateProps): JSX.Element {
	const { isGranted, isLoading, error } = useAuthZ(LIST_CHECKS);

	if (!isLoading && !error && !isGranted(RuleListPermission)) {
		return (
			<PermissionDeniedCallout
				deniedPermissions={LIST_CHECKS}
				className={className}
			/>
		);
	}

	return <>{children}</>;
}

export default AlertRulesListGate;
