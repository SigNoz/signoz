import type { ReactElement } from 'react';
import { AuthZGuardContent } from 'lib/authz/components/AuthZGuard/AuthZGuardContent';
import PermissionDeniedCallout from 'lib/authz/components/PermissionDeniedCallout/PermissionDeniedCallout';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

import styles from './ViewsRailGuard.module.scss';

interface Props {
	/** What reading the list's saved views needs. */
	checks: BrandedPermission[];
	children: ReactElement;
}

function ViewsRailGuard({ checks, children }: Props): JSX.Element {
	return (
		<AuthZGuardContent
			checks={checks}
			onFailRenderContent={false}
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
