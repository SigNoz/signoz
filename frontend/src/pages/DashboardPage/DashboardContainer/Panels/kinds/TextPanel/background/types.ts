export type TextBackgroundPreset =
	| 'robin'
	| 'purple'
	| 'sakura'
	| 'cherry'
	| 'amber'
	| 'forest'
	| 'sienna'
	| 'slate';

export type TextBackgroundKind = 'none' | 'default' | 'preset' | 'custom';

/** `custom` is absent: it opens a picker, so it has its own row. */
export type TextBackgroundSelection = 'none' | 'default' | TextBackgroundPreset;

export type PanelTheme = 'light' | 'dark';

export interface TextBackgroundPair {
	surface: string;
	ink: string;
}

/** `none` and `default` carry no colours: the card keeps or drops its own. */
export interface ResolvedTextBackground {
	kind: TextBackgroundKind;
	preset?: TextBackgroundPreset;
	surface?: string;
	ink?: string;
}
