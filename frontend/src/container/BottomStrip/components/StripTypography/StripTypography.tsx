import type { ReactNode } from 'react';
import { Typography } from '@signozhq/ui/typography';

import styles from './StripTypography.module.scss';

interface StripTypographyProps {
	children: ReactNode;
	/** Leading icon, aligned and spaced for you. Same shape as `Button`'s. */
	prefix?: ReactNode;
}

/**
 * A single phrase in the strip: the version, or a count a page states in its own
 * words. A labelled number belongs in `StripKeyValue` instead. There is no
 * `className`; everything the strip renders looks the same by construction.
 */
function StripTypography({
	children,
	prefix,
}: StripTypographyProps): JSX.Element {
	return (
		<span className={styles.stripTypography}>
			{prefix}
			<Typography.Text as="span">{children}</Typography.Text>
		</span>
	);
}

StripTypography.defaultProps = { prefix: undefined };

export type { StripTypographyProps };
export default StripTypography;
