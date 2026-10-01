import {
	type ResolvedTextBackground,
	TextBackgroundKind,
	type TextBackgroundPreset,
} from 'pages/DashboardPage/DashboardContainer/Panels/kinds/TextPanel/background/types';

export const PRESET_TITLES: Record<TextBackgroundPreset, string> = {
	robin: 'Robin',
	purple: 'Purple',
	sakura: 'Sakura',
	cherry: 'Cherry',
	amber: 'Amber',
	forest: 'Forest',
	sienna: 'Sienna',
	slate: 'Slate',
};

export type BaseSelection =
	| TextBackgroundKind.None
	| TextBackgroundKind.Default;

export const BASE_TITLES: Record<BaseSelection, string> = {
	none: 'Transparent',
	default: 'Default panel',
};

export function backgroundTitle(background: ResolvedTextBackground): string {
	switch (background.kind) {
		case TextBackgroundKind.Preset:
			return background.preset ? PRESET_TITLES[background.preset] : 'Custom';
		case TextBackgroundKind.Custom:
			return `Custom ${background.surface?.toUpperCase() ?? ''}`.trim();
		case TextBackgroundKind.None:
			return BASE_TITLES.none;
		default:
			return BASE_TITLES.default;
	}
}
