import type { ReactNode } from 'react';
import { Typography } from '@signozhq/ui/typography';

import styles from './StripTypography.module.scss';

interface StripTypographyProps {
	children: ReactNode;
	/** Leading icon. Same shape as `Button`'s. */
	prefix?: ReactNode;
}

/** A single phrase. A labelled number belongs in `StripKeyValue`. */
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
