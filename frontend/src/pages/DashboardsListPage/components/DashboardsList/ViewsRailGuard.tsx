import type { ReactElement } from 'react';
import { AuthZGuardContent } from 'lib/authz/components/AuthZGuard/AuthZGuardContent';
import PermissionDeniedCallout from 'lib/authz/components/PermissionDeniedCallout/PermissionDeniedCallout';
import { LIST_CHECKS } from 'pages/DashboardsListPage/constants/permissions';

import styles from './ViewsRailGuard.module.scss';

interface Props {
	children: ReactElement;
}

function ViewsRailGuard({ children }: Props): JSX.Element {
	return (
		<AuthZGuardContent
			checks={LIST_CHECKS}
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
