import { orange } from '@ant-design/colors';
import { themeColors } from 'constants/theme';
import getAlphaColor from 'utils/getAlphaColor';

export const getDefaultLogBackground = (
	isReadOnly: boolean,
	isDarkMode: boolean,
): string => {
	if (isReadOnly) return '';
	return `&:hover {
    background-color: ${
					isDarkMode
						? getAlphaColor(themeColors.white)[10]
						: getAlphaColor(themeColors.black)[10]
				};
    }`;
};

export const getActiveLogBackground = (isActiveLog = true): string => {
	if (!isActiveLog) return '';
	return `background-color: ${orange[3]};`;
};
