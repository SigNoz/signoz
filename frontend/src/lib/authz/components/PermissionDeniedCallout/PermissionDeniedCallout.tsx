import { Callout } from '@signozhq/ui/callout';
import cx from 'classnames';
import styles from './PermissionDeniedCallout.module.scss';
import { useAppContext } from 'providers/App/App';
import { Typography } from '@signozhq/ui/typography';
import { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { formatPermission } from 'lib/authz/hooks/useAuthZ/utils';

export interface PermissionDeniedCalloutProps {
	/**
	 * @deprecated Use `deniedPermissions` instead. Will be removed after authz devtools PR merges.
	 */
	permissionName?: string;
	deniedPermissions?: BrandedPermission[];
	className?: string;
}

function PermissionDeniedCallout({
	permissionName,
	deniedPermissions,
	className,
}: PermissionDeniedCalloutProps): JSX.Element {
	const { user } = useAppContext();

	// TODO(authz): Remove permissionName support after devtools PR merges
	const formattedPermissions = deniedPermissions
		? deniedPermissions.map(formatPermission)
		: permissionName
			? [permissionName]
			: [];

	return (
		<Callout
			type="error"
			showIcon
			size="small"
			className={cx(styles.callout, className)}
		>
			<Typography.Text className={styles.permission}>
				<code className={styles.permissionCode}>user/{user.id}</code> is not
				authorized to perform{' '}
				{formattedPermissions.map((perm, idx) => (
					<span key={perm}>
						<code className={styles.permissionCode}>{perm}</code>
						{idx < formattedPermissions.length - 1 && ', '}
					</span>
				))}
			</Typography.Text>
		</Callout>
	);
}

export default PermissionDeniedCallout;
