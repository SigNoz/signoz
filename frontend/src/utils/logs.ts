import { orange } from '@ant-design/colors';
import { Color } from '@signozhq/design-tokens';
import { LogType } from 'components/Logs/LogStateIndicator/LogStateIndicator';

export const getDefaultLogBackground = (
	isReadOnly?: boolean,
	isDarkMode?: boolean,
): string => {
	if (isReadOnly) return '';
	// TODO handle the light mode here
	return `&:hover {
    background-color: ${
					isDarkMode ? 'rgba(171, 189, 255, 0.04)' : 'var(--bg-vanilla-200)'
				};
    }`;
};

export const getActiveLogBackground = (
	isActiveLog = true,
	isDarkMode = true,
	logType?: string,
): string => {
	if (!isActiveLog) return ``;
	if (isDarkMode) {
		switch (logType) {
			case LogType.INFO:
				return `background-color: ${Color.BG_ROBIN_500}10 !important;`;
			case LogType.WARN:
				return `background-color: ${Color.BG_AMBER_500}10 !important;`;
			case LogType.ERROR:
				return `background-color: ${Color.BG_CHERRY_500}10 !important;`;
			case LogType.TRACE:
				return `background-color: ${Color.BG_FOREST_400}10 !important;`;
			case LogType.DEBUG:
				return `background-color: ${Color.BG_AQUA_500}10 !important;`;
			case LogType.FATAL:
				return `background-color: ${Color.BG_SAKURA_500}10 !important;`;
			default:
				return `background-color: ${Color.BG_SLATE_200} !important;`;
		}
	}
	return `background-color: ${Color.BG_VANILLA_300}!important; color: ${Color.TEXT_SLATE_400} !important;`;
};

export const getHightLightedLogBackground = (
	isHighlightedLog = true,
): string => {
	if (!isHighlightedLog) return '';
	return `background-color: ${orange[3]};`;
};
