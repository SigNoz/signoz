import { forwardRef } from 'react';
import cx from 'classnames';

import styles from './Layout.module.scss';
import type { HeaderProps } from './types';

/** Drop-in replacement for antd's `Layout.Header` (5.11). */
const Header = forwardRef<HTMLElement, HeaderProps>(function Header(
	{ className, ...rest },
	ref,
) {
	return <header ref={ref} className={cx(styles.header, className)} {...rest} />;
});

export default Header;
