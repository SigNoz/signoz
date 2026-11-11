import type { HTMLAttributes } from 'react';

export type ColBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/** Grid placement in a 24-column row. */
export interface ColSize {
	span?: number;
	order?: number;
	offset?: number;
	push?: number;
	pull?: number;
}

/**
 * A number `n` grows and shrinks as `n n auto`; a length (`100px`, `2em`,
 * `25%`) is a fixed basis; anything else is used as the `flex` value.
 */
export type ColFlex =
	| number
	| 'none'
	| 'auto'
	| (string & Record<never, never>);

export type ColResponsiveProps = Partial<
	Record<ColBreakpoint, number | ColSize>
>;

export interface ColProps
	extends HTMLAttributes<HTMLDivElement>, ColSize, ColResponsiveProps {
	flex?: ColFlex;
}
