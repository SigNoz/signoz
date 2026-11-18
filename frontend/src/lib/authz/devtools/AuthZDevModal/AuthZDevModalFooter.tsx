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
					<Kbd value="Escape" testId="authz-dev-modal-escape-key" />
					<Typography
						variant="paragraph"
						size="small"
						weight="regular"
						color="secondary"
						as="span"
						textOverflow="wrap"
					>
						close
					</Typography>
				</span>
			</div>
			<Typography
				variant="paragraph"
				size="small"
				weight="regular"
				color="secondary"
				as="span"
				textOverflow="visible"
			>
				{orderedPermissionsCount} of {observedListLength} permissions
			</Typography>
		</div>
	);
}
