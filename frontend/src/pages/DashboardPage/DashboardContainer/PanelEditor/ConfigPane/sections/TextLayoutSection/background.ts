import {
	TEXT_BACKGROUND_PAIRS,
	TEXT_BACKGROUND_PRESETS,
} from 'pages/DashboardPage/DashboardContainer/Panels/kinds/TextPanel/background/presets';
import {
	type PanelTheme,
	type ResolvedTextBackground,
	TextBackgroundKind,
	type TextBackgroundPreset,
	type TextBackgroundSelection,
} from 'pages/DashboardPage/DashboardContainer/Panels/kinds/TextPanel/background/types';

import type { ColorSwatchOption } from '../../controls/ColorSwatches/ColorSwatches';

const PRESET_TITLES: Record<TextBackgroundPreset, string> = {
	robin: 'Robin',
	purple: 'Purple',
	sakura: 'Sakura',
	cherry: 'Cherry',
	amber: 'Amber',
	forest: 'Forest',
	sienna: 'Sienna',
	slate: 'Slate',
};

type BaseSelection = TextBackgroundKind.None | TextBackgroundKind.Default;

const BASE_TITLES: Record<BaseSelection, string> = {
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

const BASE_TOOLTIPS: Record<BaseSelection, string> = {
	none: 'Transparent — no card, border or title bar',
	default: 'Default panel color',
};

export function backgroundOptions(
	theme: PanelTheme,
): ColorSwatchOption<TextBackgroundSelection>[] {
	return [
		{
			value: TextBackgroundKind.None,
			id: TextBackgroundKind.None,
			label: BASE_TITLES.none,
			tooltip: BASE_TOOLTIPS.none,
			pattern: 'transparent',
		},
		{
			value: TextBackgroundKind.Default,
			id: TextBackgroundKind.Default,
			label: BASE_TITLES.default,
			tooltip: BASE_TOOLTIPS.default,
			pattern: 'surface',
		},
		...TEXT_BACKGROUND_PRESETS.map((preset) => ({
			value: preset,
			id: preset,
			label: PRESET_TITLES[preset],
			fill: TEXT_BACKGROUND_PAIRS[preset][theme].surface,
		})),
	];
}
