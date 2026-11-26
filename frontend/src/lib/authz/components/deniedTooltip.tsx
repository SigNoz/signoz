import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

import { formatDeniedMessage } from './formatDeniedMessage';

import styles from './deniedTooltip.module.scss';

/** A denial already worded, shown on the red tooltip. */
export function deniedReason(message: string): JSX.Element {
	return <span className={styles.denied}>{message}</span>;
}

export function deniedTooltip(
	denied: BrandedPermission[],
	userId: string,
	override?: string,
): JSX.Element {
	return deniedReason(formatDeniedMessage(denied, userId, override));
}
