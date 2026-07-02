import { CircleSlash2 } from '@signozhq/icons';

import styles from './PermissionDeniedFullPage.module.scss';
import { Style } from '@signozhq/design-tokens';
import { useAppContext } from 'providers/App/App';
import { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { formatPermission } from 'lib/authz/hooks/useAuthZ/utils';

interface PermissionDeniedFullPageProps {
	deniedPermissions: BrandedPermission[];
}

function PermissionDeniedFullPage({
	deniedPermissions,
}: PermissionDeniedFullPageProps): JSX.Element {
	const { user } = useAppContext();
	const formattedPermissions = deniedPermissions.map(formatPermission);

	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<span className={styles.icon}>
					<CircleSlash2 color={Style.CALLOUT_WARNING_TITLE} size={14} />
				</span>
				<p className={styles.title}>Uh-oh! You are not authorized</p>
				<p className={styles.subtitle}>
					<code className={styles.permission}>user/{user.id}</code> is not authorized
					to perform{' '}
					{formattedPermissions.map((perm, idx) => (
						<span key={perm}>
							<code className={styles.permission}>{perm}</code>
							{idx < formattedPermissions.length - 1 && ', '}
						</span>
					))}
				</p>
			</div>
		</div>
	);
}

export default PermissionDeniedFullPage;
