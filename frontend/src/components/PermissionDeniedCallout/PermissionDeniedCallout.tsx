import { Callout } from '@signozhq/ui/callout';
import cx from 'classnames';
import styles from './PermissionDeniedCallout.module.scss';

interface PermissionDeniedCalloutProps {
	permissionName: string;
	className?: string;
}

function PermissionDeniedCallout({
	permissionName,
	className,
}: PermissionDeniedCalloutProps): JSX.Element {
	return (
		<Callout
			type="error"
			showIcon
			size="small"
			className={cx(styles.callout, className)}
		>
			{`You don't have ${permissionName} permission`}
		</Callout>
	);
}

export default PermissionDeniedCallout;
