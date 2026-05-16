import { CircleSlash2 } from '@signozhq/icons';

import styles from './PermissionDeniedFullPage.module.scss';
import { Style } from '@signozhq/design-tokens';

interface PermissionDeniedFullPageProps {
	permissionName: string;
}

function PermissionDeniedFullPage({
	permissionName,
}: PermissionDeniedFullPageProps): JSX.Element {
	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<span className={styles.icon}>
					<CircleSlash2 color={Style.CALLOUT_WARNING_TITLE} size={14} />
				</span>
				<p className={styles.title}>
					Uh-oh! You don&apos;t have permission to view this page.
				</p>
				<p className={styles.subtitle}>
					You need <code className={styles.permission}>{permissionName}</code> to
					view this page. Please ask your SigNoz administrator to grant access.
				</p>
			</div>
		</div>
	);
}

export default PermissionDeniedFullPage;
