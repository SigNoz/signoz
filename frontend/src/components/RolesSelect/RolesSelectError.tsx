import { CircleAlert } from '@signozhq/icons';
import APIError from 'types/api/error';

import styles from './RolesSelect.module.scss';

interface RolesSelectErrorProps {
	error?: APIError;
	canRetry: boolean;
}

function RolesSelectError({
	error,
	canRetry,
}: RolesSelectErrorProps): JSX.Element {
	return (
		<span className={styles.error} data-testid="roles-select-error">
			<span className={styles.errorMessage}>
				<CircleAlert size={12} />
				<span className="translate-safe">
					{error?.message || 'Failed to load roles'}
				</span>
			</span>
			{canRetry && <span className={styles.retry}>Retry</span>}
		</span>
	);
}

export default RolesSelectError;
