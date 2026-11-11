import type { HTMLAttributes } from 'react';

export interface LayoutProps extends HTMLAttributes<HTMLDivElement> {
	/** Lays children out in a row, as antd does when a `Sider` is a child. */
	hasSider?: boolean;
	rootClassName?: string;
}

export type HeaderProps = HTMLAttributes<HTMLElement>;

export type FooterProps = HTMLAttributes<HTMLElement>;

export type ContentProps = HTMLAttributes<HTMLElement>;
