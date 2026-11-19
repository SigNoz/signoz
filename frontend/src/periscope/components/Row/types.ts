import type { HTMLAttributes } from 'react';

export type Breakpoint = 'xxl' | 'xl' | 'lg' | 'md' | 'sm' | 'xs';

export type Screens = Record<Breakpoint, boolean>;

export type Responsive<T> = Partial<Record<Breakpoint, T>>;

export type RowAlign = 'top' | 'middle' | 'bottom' | 'stretch';

export type RowJustify =
	| 'start'
	| 'end'
	| 'center'
	| 'space-around'
	| 'space-between'
	| 'space-evenly';

export type Gutter = number | undefined | Responsive<number>;

export interface RowProps extends HTMLAttributes<HTMLDivElement> {
	/** `[horizontal, vertical]` in px; a single value is horizontal only. */
	gutter?: Gutter | [Gutter, Gutter];
	align?: RowAlign | Responsive<RowAlign>;
	justify?: RowJustify | Responsive<RowJustify>;
	wrap?: boolean;
}
