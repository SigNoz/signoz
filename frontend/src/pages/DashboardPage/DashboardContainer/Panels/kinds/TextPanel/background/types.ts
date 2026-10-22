export enum TextBackgroundPreset {
	Robin = 'robin',
	Purple = 'purple',
	Sakura = 'sakura',
	Cherry = 'cherry',
	Amber = 'amber',
	Forest = 'forest',
	Sienna = 'sienna',
	Slate = 'slate',
}

export enum TextBackgroundKind {
	None = 'none',
	Default = 'default',
	Preset = 'preset',
	Custom = 'custom',
}

/** `Custom` is absent: it opens a picker, so it has its own row. */
export type TextBackgroundSelection =
	| TextBackgroundKind.None
	| TextBackgroundKind.Default
	| TextBackgroundPreset;

export enum PanelTheme {
	Light = 'light',
	Dark = 'dark',
}

export interface TextBackgroundPair {
	surface: string;
	ink: string;
}

/** `None` and `Default` carry no colours: the card keeps or drops its own. */
export interface ResolvedTextBackground {
	kind: TextBackgroundKind;
	preset?: TextBackgroundPreset;
	surface?: string;
	ink?: string;
}
