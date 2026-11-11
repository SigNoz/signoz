import { forwardRef } from 'react';
import cx from 'classnames';

import styles from './Layout.module.scss';
import type { ContentProps } from './types';

/** Drop-in replacement for antd's `Layout.Content` (5.11). */
const Content = forwardRef<HTMLElement, ContentProps>(function Content(
	{ className, ...rest },
	ref,
) {
	return <main ref={ref} className={cx(styles.content, className)} {...rest} />;
});

export default Content;
