import { CircleSlash2 } from '@signozhq/icons';

import styles from './PermissionDeniedFullPage.module.scss';
import { Style } from '@signozhq/design-tokens';
import { useAppContext } from 'providers/App/App';
import { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { formatPermission } from 'lib/authz/hooks/useAuthZ/utils';

export interface PermissionDeniedFullPageProps {
	/**
	 * @deprecated Use `deniedPermissions` instead. Will be removed after authz devtools PR merges.
	 */
	permissionName?: string;
	deniedPermissions?: BrandedPermission[];
}

function PermissionDeniedFullPage({
	permissionName,
	deniedPermissions,
}: PermissionDeniedFullPageProps): JSX.Element {
	const { user } = useAppContext();

	// TODO(authz): Remove permissionName support after devtools PR merges
	const formattedPermissions = deniedPermissions
		? deniedPermissions.map(formatPermission)
		: permissionName
			? [permissionName]
			: [];

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
