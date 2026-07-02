import { Callout } from '@signozhq/ui/callout';
import cx from 'classnames';
import styles from './PermissionDeniedCallout.module.scss';
import { useAppContext } from 'providers/App/App';
import { Typography } from '@signozhq/ui/typography';
import { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { formatPermission } from 'lib/authz/hooks/useAuthZ/utils';

interface PermissionDeniedCalloutProps {
	deniedPermissions: BrandedPermission[];
	className?: string;
}

function PermissionDeniedCallout({
	deniedPermissions,
	className,
}: PermissionDeniedCalloutProps): JSX.Element {
	const { user } = useAppContext();
	const formattedPermissions = deniedPermissions.map(formatPermission);

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
