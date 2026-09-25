import type { ReactNode } from 'react';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import styles from './StripTypography.module.scss';

interface StripTypographyProps {
	children: ReactNode;
	/** Leading icon, aligned and spaced for you. Same shape as `Button`'s. */
	prefix?: ReactNode;
	className?: string;
}

/**
 * Everything the strip renders goes through this: the version, a plain count, or
 * an icon with a key and value. It owns the strip's type and alignment and
 * nothing else — how a consumer colours its own content is theirs.
 */
function StripTypography({
	children,
	prefix,
	className,
}: StripTypographyProps): JSX.Element {
	return (
		<span className={cx(styles.stripTypography, className)}>
			{prefix}
			<Typography.Text as="span">{children}</Typography.Text>
		</span>
	);
}

StripTypography.defaultProps = { prefix: undefined, className: undefined };

export default StripTypography;
