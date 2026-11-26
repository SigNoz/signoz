import type { ReactElement } from 'react';
import { AuthZGuardContent } from 'lib/authz/components/AuthZGuard/AuthZGuardContent';
import PermissionDeniedCallout from 'lib/authz/components/PermissionDeniedCallout/PermissionDeniedCallout';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

import styles from './ViewsRailGuard.module.scss';

interface Props {
	/** What reading the list's saved views needs. */
	checks: BrandedPermission[];
	/**
	 * Show the rail until the check denies it: while it runs, and when the check
	 * itself fails, leaving the API to decide. For a list that renders before its
	 * own check does.
	 */
	shouldRenderUntilDenied?: boolean;
	children: ReactElement;
}

function ViewsRailGuard({
	checks,
	shouldRenderUntilDenied = false,
	children,
}: Props): JSX.Element {
	return (
		<AuthZGuardContent
			checks={checks}
			onFailRenderContent={shouldRenderUntilDenied}
			fallbackOnLoading={shouldRenderUntilDenied ? children : undefined}
			fallback={({ deniedPermissions }): ReactElement => (
				<div className={styles.denied} data-testid="views-rail-denied">
					<PermissionDeniedCallout deniedPermissions={deniedPermissions} />
				</div>
			)}
		>
			{children}
		</AuthZGuardContent>
	);
}

export default ViewsRailGuard;
