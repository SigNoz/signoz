import type { CSSProperties } from 'react';
import cx from 'classnames';

import type { RowContextState } from '../Row/RowContext';
import styles from './Col.module.scss';
import type {
	ColBreakpoint,
	ColFlex,
	ColProps,
	ColResponsiveProps,
	ColSize,
} from './types';

type GridKey = keyof ColSize;

const GRID_KEYS: readonly GridKey[] = [
	'span',
	'order',
	'offset',
	'push',
	'pull',
];

const BREAKPOINTS: readonly ColBreakpoint[] = [
	'xs',
	'sm',
	'md',
	'lg',
	'xl',
	'xxl',
];

const FIXED_BASIS = /^\d+(\.\d+)?(px|em|rem|%)$/;

/** `('', 'span', 12)` → `span12`; `('md', 'offset', 3)` → `mdOffset3`. */
function gridClass(
	breakpoint: ColBreakpoint | '',
	key: GridKey,
	value: number,
): string | undefined {
	const name = breakpoint
		? `${breakpoint}${key[0].toUpperCase()}${key.slice(1)}`
		: key;
	// Keys come from the SCSS loops, all camelCase.
	// eslint-disable-next-line signoz/no-css-module-bracket-access
	return styles[`${name}${value}`];
}

// Like antd, a top-level `0` only counts for `span`; inside a breakpoint every
// key honours `0`.
function baseClasses(size: ColSize): (string | undefined)[] {
	return GRID_KEYS.map((key) => {
		const value = size[key];
		if (value === undefined || (key !== 'span' && !value)) {
			return undefined;
		}
		return gridClass('', key, value);
	});
}

function breakpointClasses(
	responsive: ColResponsiveProps,
): (string | undefined)[] {
	return BREAKPOINTS.flatMap((breakpoint) => {
		const prop = responsive[breakpoint];
		const size: ColSize =
			typeof prop === 'number' ? { span: prop } : (prop ?? {});
		return GRID_KEYS.map((key) => {
			const value = size[key];
			return value === undefined ? undefined : gridClass(breakpoint, key, value);
		});
	});
}

type ColClassNameInput = Pick<ColProps, 'className' | GridKey | ColBreakpoint>;

export function getColClassName({
	className,
	span,
	order,
	offset,
	push,
	pull,
	...responsive
}: ColClassNameInput): string {
	return cx(
		styles.col,
		baseClasses({ span, order, offset, push, pull }),
		className,
		breakpointClasses(responsive),
	);
}

function parseFlex(flex: ColFlex): CSSProperties['flex'] {
	if (typeof flex === 'number') {
		return `${flex} ${flex} auto`;
	}
	return FIXED_BASIS.test(flex) ? `0 0 ${flex}` : flex;
}

/** Gutter padding and `flex` first, so `style` overrides them as in antd. */
export function getColStyle(
	style: CSSProperties | undefined,
	flex: ColFlex | undefined,
	{ gutter, wrap }: RowContextState,
): CSSProperties {
	const merged: CSSProperties = {};
	if (gutter && gutter[0] > 0) {
		merged.paddingLeft = gutter[0] / 2;
		merged.paddingRight = gutter[0] / 2;
	}
	if (flex) {
		merged.flex = parseFlex(flex);
		// antd's Firefox fix for a non-wrapping row.
		if (wrap === false) {
			merged.minWidth = 0;
		}
	}
	return { ...merged, ...style };
}
