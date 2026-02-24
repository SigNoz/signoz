import { orange } from '@ant-design/colors';
import { Color } from '@signozhq/design-tokens';
import { LogType } from 'components/Logs/LogStateIndicator/LogStateIndicator';

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
			case LogType.INFO:
				return `background-color: ${Color.BG_ROBIN_500}40 !important;`;
			case LogType.WARN:
				return `background-color: ${Color.BG_AMBER_500}40 !important;`;
			case LogType.ERROR:
				return `background-color: ${Color.BG_CHERRY_500}40 !important;`;
			case LogType.TRACE:
				return `background-color: ${Color.BG_FOREST_400}40 !important;`;
			case LogType.DEBUG:
				return `background-color: ${Color.BG_AQUA_500}40 !important;`;
			case LogType.FATAL:
				return `background-color: ${Color.BG_SAKURA_500}40 !important;`;
			default:
				return `background-color: ${Color.BG_ROBIN_500}40 !important;`;
		}
	}
	// Light mode - use lighter background colors
	switch (logType) {
		case LogType.INFO:
			return `background-color: ${Color.BG_ROBIN_100} !important;`;
		case LogType.WARN:
			return `background-color: ${Color.BG_AMBER_100} !important;`;
		case LogType.ERROR:
			return `background-color: ${Color.BG_CHERRY_100} !important;`;
		case LogType.TRACE:
			return `background-color: ${Color.BG_FOREST_200} !important;`;
		case LogType.DEBUG:
			return `background-color: ${Color.BG_AQUA_100} !important;`;
		case LogType.FATAL:
			return `background-color: ${Color.BG_SAKURA_100} !important;`;
		default:
			return `background-color: ${Color.BG_VANILLA_300} !important;`;
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

	return `background-color: ${Color.BG_ROBIN_500}20;`;
};
