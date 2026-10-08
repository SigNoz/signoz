import { HTMLAttributes } from 'react';
import cx from 'classnames';

import styles from './TooltipSurface.module.scss';

function TooltipSurface({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>): JSX.Element {
	return <div className={cx(styles.surface, className)} {...props} />;
}

export default TooltipSurface;
