import type { CSSProperties, HTMLAttributes } from 'react';

export type FlexWrap = 'wrap' | 'nowrap' | 'wrap-reverse';

export type FlexJustify =
	| 'flex-start'
	| 'flex-end'
	| 'start'
	| 'end'
	| 'center'
	| 'space-between'
	| 'space-around'
	| 'space-evenly'
	| 'stretch'
	| 'normal'
	| 'left'
	| 'right';

export type FlexAlign =
	| 'center'
	| 'start'
	| 'end'
	| 'flex-start'
	| 'flex-end'
	| 'self-start'
	| 'self-end'
	| 'baseline'
	| 'normal'
	| 'stretch';

export type FlexGapPreset = 'small' | 'middle' | 'large';

export interface FlexProps extends HTMLAttributes<HTMLDivElement> {
	vertical?: boolean;
	wrap?: FlexWrap;
	justify?: FlexJustify;
	align?: FlexAlign;
	flex?: CSSProperties['flex'];
	/** Presets are 8px, 16px and 24px. A falsy gap (`0`, `''`) is ignored. */
	gap?: FlexGapPreset | number | (string & Record<never, never>);
}
