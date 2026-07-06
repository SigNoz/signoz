import { CircleSlash2 } from '@signozhq/icons';

import styles from './PermissionDeniedFullPage.module.scss';
import { Style } from '@signozhq/design-tokens';
import { useAppContext } from 'providers/App/App';

interface PermissionDeniedFullPageProps {
	permissionName: string;
}

function PermissionDeniedFullPage({
	permissionName,
}: PermissionDeniedFullPageProps): JSX.Element {
	const { user } = useAppContext();

	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<span className={styles.icon}>
					<CircleSlash2 color={Style.CALLOUT_WARNING_TITLE} size={14} />
				</span>
				<p className={styles.title}>Uh-oh! You are not authorized</p>
				<p className={styles.subtitle}>
					<code className={styles.permission}>user/{user.id}</code> is not authorized
					to perform <code className={styles.permission}>{permissionName}</code>
				</p>
			</div>
		</div>
	);
}

export default PermissionDeniedFullPage;
