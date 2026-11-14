import { Color } from '@signozhq/design-tokens';

import type { ColorSwatchOption } from '../../controls/ColorSwatches/ColorSwatches';

export const BAR_COLOR_OPTIONS: ColorSwatchOption<string>[] = [
	{ id: 'robin', color: Color.BG_ROBIN_500 },
	{ id: 'aqua', color: Color.BG_AQUA_500 },
	{ id: 'forest', color: Color.BG_FOREST_500 },
	{ id: 'amber', color: Color.BG_AMBER_500 },
	{ id: 'sienna', color: Color.BG_SIENNA_500 },
].map(({ id, color }) => ({
	value: color,
	id,
	label: id.charAt(0).toUpperCase() + id.slice(1),
	fill: color,
}));

/** The preset a hex matches, ignoring case. */
export function findBarColorPreset(hex: string): string | undefined {
	return BAR_COLOR_OPTIONS.find(
		(option) => option.value.toLowerCase() === hex.toLowerCase(),
	)?.value;
}
