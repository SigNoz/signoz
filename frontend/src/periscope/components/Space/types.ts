import type { HTMLAttributes, ReactNode } from 'react';

export type SpaceSizePreset = 'small' | 'middle' | 'large';

/** Presets are 8px, 16px and 24px. A falsy or `NaN` number is ignored. */
export type SpaceSize = SpaceSizePreset | number;

export type SpaceDirection = 'horizontal' | 'vertical';

export type SpaceAlign = 'start' | 'end' | 'center' | 'baseline';

export interface SpaceProps extends HTMLAttributes<HTMLDivElement> {
	/** A pair sets `[column gap, row gap]`. Defaults to `'small'`. */
	size?: SpaceSize | [SpaceSize, SpaceSize];
	direction?: SpaceDirection;
	/** Defaults to `'center'` for a horizontal space. */
	align?: SpaceAlign;
	/** Rendered between items, after each non-empty child but the last. */
	split?: ReactNode;
	wrap?: boolean;
}

export interface SpaceItemProps {
	children: ReactNode;
	split: ReactNode;
	showSplit: boolean;
}

export interface SpaceCompactProps extends HTMLAttributes<HTMLDivElement> {
	direction?: SpaceDirection;
	/** Fills the parent's width. */
	block?: boolean;
}
