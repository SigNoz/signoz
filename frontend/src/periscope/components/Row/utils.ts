import type { CSSProperties } from 'react';
import cx from 'classnames';

import styles from './Row.module.scss';
import type {
	Breakpoint,
	Gutter,
	Responsive,
	RowAlign,
	RowJustify,
	RowProps,
	Screens,
} from './types';

/** Widest first: a responsive value resolves to the widest matching breakpoint. */
export const BREAKPOINTS: readonly Breakpoint[] = [
	'xxl',
	'xl',
	'lg',
	'md',
	'sm',
	'xs',
];

/** antd 5.11's default screen tokens. */
export const SCREEN_QUERIES: Record<Breakpoint, string> = {
	xs: '(max-width: 575px)',
	sm: '(min-width: 576px)',
	md: '(min-width: 768px)',
	lg: '(min-width: 992px)',
	xl: '(min-width: 1200px)',
	xxl: '(min-width: 1600px)',
};

export const ALL_SCREENS: Screens = {
	xxl: true,
	xl: true,
	lg: true,
	md: true,
	sm: true,
	xs: true,
};

const JUSTIFY_CLASS: Record<RowJustify, string> = {
	start: styles.justifyStart,
	end: styles.justifyEnd,
	center: styles.justifyCenter,
	'space-around': styles.justifySpaceAround,
	'space-between': styles.justifySpaceBetween,
	'space-evenly': styles.justifySpaceEvenly,
};

// antd 5.11 adds a class for `stretch` but styles nothing with it.
const ALIGN_CLASS: Record<RowAlign, string | undefined> = {
	top: styles.alignTop,
	middle: styles.alignMiddle,
	bottom: styles.alignBottom,
	stretch: undefined,
};

export function resolveResponsive<T>(
	value: T | Responsive<T> | undefined,
	screens: Screens,
): T | undefined {
	if (!isResponsiveValue(value)) {
		return value;
	}
	const breakpoint = BREAKPOINTS.find(
		(bp) => screens[bp] && value[bp] !== undefined,
	);
	return breakpoint && value[breakpoint];
}

export function isResponsiveValue<T>(
	value: T | Responsive<T> | undefined,
): value is Responsive<T> {
	return typeof value === 'object' && value !== null;
}

export function isResponsiveGutter(gutter: RowProps['gutter']): boolean {
	const gutters = Array.isArray(gutter) ? gutter : [gutter];
	return gutters.some(isResponsiveValue);
}

export function resolveGutters(
	gutter: Gutter | [Gutter, Gutter],
	screens: Screens,
): [number | undefined, number | undefined] {
	const [horizontal, vertical] = Array.isArray(gutter) ? gutter : [gutter];
	return [
		resolveResponsive(horizontal, screens),
		resolveResponsive(vertical, screens),
	];
}

export function getRowClassName({
	className,
	wrap,
	align,
	justify,
}: {
	className?: string;
	wrap?: boolean;
	align?: RowAlign;
	justify?: RowJustify;
}): string {
	return cx(
		styles.row,
		wrap === false && styles.noWrap,
		justify && JUSTIFY_CLASS[justify],
		align && ALIGN_CLASS[align],
		className,
	);
}

/** Key order matches antd so the inline `style` attribute is identical. */
export function getRowStyle(
	[horizontal, vertical]: [number | undefined, number | undefined],
	style: CSSProperties | undefined,
): CSSProperties {
	const rowStyle: CSSProperties = {};
	if (horizontal !== undefined && horizontal > 0) {
		rowStyle.marginLeft = horizontal / -2;
		rowStyle.marginRight = horizontal / -2;
	}
	rowStyle.rowGap = vertical;
	return { ...rowStyle, ...style };
}

export function readScreens(): Screens {
	return BREAKPOINTS.reduce((screens, bp) => {
		screens[bp] = window.matchMedia(SCREEN_QUERIES[bp]).matches;
		return screens;
	}, {} as Screens);
}
