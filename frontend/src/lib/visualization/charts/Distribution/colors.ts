import { Color } from '@signozhq/design-tokens';
import { themeColors } from 'constants/theme';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { toAlphaHex } from 'lib/uPlotV2/utils/fillOpacity';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function withOpacity(color: string, opacity: number): string {
	return HEX_COLOR.test(color) ? `${color}${toAlphaHex(opacity)}` : color;
}

/** Neutral, so the summed remainder never reads as one more group. */
export function resolveOtherColor(isDarkMode: boolean): string {
	return isDarkMode ? Color.BG_VANILLA_400 : Color.BG_SLATE_50;
}

export function resolveSeriesColor(
	label: string,
	isDarkMode: boolean,
	customColors?: Record<string, string>,
): string {
	return (
		customColors?.[label] ??
		generateColor(
			label,
			isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
		)
	);
}
