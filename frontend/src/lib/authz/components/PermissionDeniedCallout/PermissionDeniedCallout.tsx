import { Callout } from '@signozhq/ui/callout';
import cx from 'classnames';
import styles from './PermissionDeniedCallout.module.scss';
import { useAppContext } from 'providers/App/App';
import { Typography } from '@signozhq/ui/typography';

interface PermissionDeniedCalloutProps {
	permissionName: string;
	className?: string;
}

function PermissionDeniedCallout({
	permissionName,
	className,
}: PermissionDeniedCalloutProps): JSX.Element {
	const { user } = useAppContext();

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
				<code className={styles.permissionCode}>{permissionName}</code>
			</Typography.Text>
		</Callout>
	);
}

export default PermissionDeniedCallout;
