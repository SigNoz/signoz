import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

import { formatDeniedMessage } from './formatDeniedMessage';

import styles from './deniedTooltip.module.scss';

export function deniedTooltip(
	denied: BrandedPermission[],
	userId: string,
	override?: string,
): JSX.Element {
	return (
		<span className={styles.denied}>
			{formatDeniedMessage(denied, userId, override)}
		</span>
	);
}
