import { forwardRef } from 'react';
import cx from 'classnames';

import Content from './Content';
import Footer from './Footer';
import Header from './Header';
import styles from './Layout.module.scss';
import type { LayoutProps } from './types';

const InternalLayout = forwardRef<HTMLDivElement, LayoutProps>(function Layout(
	{ className, rootClassName, hasSider = false, ...rest },
	ref,
) {
	return (
		<div
			ref={ref}
			className={cx(
				styles.layout,
				hasSider && styles.hasSider,
				className,
				rootClassName,
			)}
			{...rest}
		/>
	);
});

/** Drop-in replacement for antd's `Layout` (5.11), without `Sider`. */
const Layout = Object.assign(InternalLayout, { Header, Footer, Content });

export default Layout;
