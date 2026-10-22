import { Kbd } from '@signozhq/ui/kbd';
import { Typography } from '@signozhq/ui/typography';

import styles from './AuthZDevModal.module.css';

export interface AuthZDevModalFooterProps {
	orderedPermissionsCount: number;
	observedListLength: number;
}

export function AuthZDevModalFooter({
	orderedPermissionsCount,
	observedListLength,
}: AuthZDevModalFooterProps): JSX.Element {
	return (
		<div className={styles.footer}>
			<div className={styles.hint}>
				<span className={styles.hintGroup}>
					<Kbd>Esc</Kbd>
					<Typography.Text as="span" size="small" color="muted">
						close
					</Typography.Text>
				</span>
			</div>
			<Typography.Text size="small" color="muted" className={styles.count}>
				{orderedPermissionsCount} of {observedListLength} permissions
			</Typography.Text>
		</div>
	);
}
