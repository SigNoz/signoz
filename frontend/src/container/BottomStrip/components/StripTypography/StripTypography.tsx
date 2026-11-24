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
			<Typography
				variant="code"
				size="base"
				weight="regular"
				color="inherit"
				as="span"
				textOverflow="visible"
			>
				{children}
			</Typography>
		</span>
	);
}

StripTypography.defaultProps = { prefix: undefined };

export default StripTypography;
