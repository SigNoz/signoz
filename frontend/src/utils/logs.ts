import { orange } from '@ant-design/colors';
import { Color } from '@signozhq/design-tokens';
import { LogType } from 'components/Logs/LogStateIndicator/LogStateIndicator';

/** 8-bit alpha from a two-digit hex string (e.g. "40" → 64/255). */
function rgbaFromHexColor(hexColor: string, alphaByteHex: string): string {
	const hex = hexColor.replace('#', '');
	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);
	const a = parseInt(alphaByteHex, 16) / 255;
	return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function rgbaFromHexColorOpaque(hexColor: string): string {
	return rgbaFromHexColor(hexColor, 'ff');
}

export const getDefaultLogBackground = (
	isReadOnly?: boolean,
	isDarkMode?: boolean,
): string => {
	if (isReadOnly) {
		return '';
	}
	return `&:hover {
    background-color: ${
					isDarkMode ? 'rgba(171, 189, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'
				};
    }`;
};

export const getActiveLogBackground = (
	isActiveLog = true,
	isDarkMode = true,
	logType?: string,
): string => {
	if (!isActiveLog) {
		return ``;
	}
	if (isDarkMode) {
		switch (logType) {
			case LogType.WARN:
				return `background-color: ${rgbaFromHexColor(
					Color.BG_AMBER_500,
					'20',
				)} !important;`;
			case LogType.ERROR:
				return `background-color: ${rgbaFromHexColor(
					Color.BG_CHERRY_500,
					'20',
				)} !important;`;
			case LogType.TRACE:
				return `background-color: ${rgbaFromHexColor(
					Color.BG_FOREST_400,
					'20',
				)} !important;`;
			case LogType.DEBUG:
				return `background-color: ${rgbaFromHexColor(
					Color.BG_AQUA_500,
					'20',
				)} !important;`;
			case LogType.FATAL:
				return `background-color: ${rgbaFromHexColor(
					Color.BG_SAKURA_500,
					'20',
				)} !important;`;
			case LogType.INFO:
			default:
				return `background-color: ${rgbaFromHexColor(
					Color.BG_ROBIN_500,
					'20',
				)} !important;`;
		}
	}
	// Light mode - use lighter background colors
	switch (logType) {
		case LogType.INFO:
			return `background-color: ${rgbaFromHexColorOpaque(
				Color.BG_ROBIN_100,
			)} !important;`;
		case LogType.WARN:
			return `background-color: ${rgbaFromHexColorOpaque(
				Color.BG_AMBER_100,
			)} !important;`;
		case LogType.ERROR:
			return `background-color: ${rgbaFromHexColorOpaque(
				Color.BG_CHERRY_100,
			)} !important;`;
		case LogType.TRACE:
			return `background-color: ${rgbaFromHexColorOpaque(
				Color.BG_FOREST_200,
			)} !important;`;
		case LogType.DEBUG:
			return `background-color: ${rgbaFromHexColorOpaque(
				Color.BG_AQUA_100,
			)} !important;`;
		case LogType.FATAL:
			return `background-color: ${rgbaFromHexColorOpaque(
				Color.BG_SAKURA_100,
			)} !important;`;
		default:
			return `background-color: ${rgbaFromHexColorOpaque(
				Color.BG_VANILLA_300,
			)} !important;`;
	}
};

export const getHightLightedLogBackground = (
	isHighlightedLog = true,
): string => {
	if (!isHighlightedLog) {
		return '';
	}
	return `background-color: ${orange[3]};`;
};

export const getCustomHighlightBackground = (isHighlighted = false): string => {
	if (!isHighlighted) {
		return '';
	}

	return `background-color: ${rgbaFromHexColor(Color.BG_ROBIN_500, '20')};`;
};
