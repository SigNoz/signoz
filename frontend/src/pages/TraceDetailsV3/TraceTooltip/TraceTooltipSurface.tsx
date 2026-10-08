import { HTMLAttributes } from 'react';
import cx from 'classnames';

import styles from './TraceTooltip.module.scss';

function TraceTooltipSurface({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>): JSX.Element {
	return <div className={cx(styles.surface, className)} {...props} />;
}

export default TraceTooltipSurface;
