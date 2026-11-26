import { forwardRef } from 'react';
import cx from 'classnames';

import styles from './Layout.module.scss';
import type { FooterProps } from './types';

/** Drop-in replacement for antd's `Layout.Footer` (5.11). */
const Footer = forwardRef<HTMLElement, FooterProps>(function Footer(
	{ className, ...rest },
	ref,
) {
	return <footer ref={ref} className={cx(styles.footer, className)} {...rest} />;
});

export default Footer;
