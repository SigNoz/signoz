import { orange } from '@ant-design/colors';
import { Color } from '@signozhq/design-tokens';

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
): string => {
	if (!isActiveLog) return ``;
	if (isDarkMode) return `background-color: ${Color.BG_SLATE_200};`;
	return `background-color: ${Color.BG_VANILLA_300}; color: ${Color.TEXT_SLATE_400}`;
};

export const getHightLightedLogBackground = (
	isHighlightedLog = true,
): string => {
	if (!isHighlightedLog) return '';
	return `background-color: ${orange[3]};`;
};
