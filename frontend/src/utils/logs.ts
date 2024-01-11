import { orange } from '@ant-design/colors';

export const getDefaultLogBackground = (
	isReadOnly?: boolean,
	isDarkMode?: boolean,
): string => {
	if (isReadOnly) return '';
	// TODO handle the light mode here
	return `&:hover {
    background-color: ${isDarkMode ? 'rgba(171, 189, 255, 0.04)' : '#F5F5F5'};
    }`;
};

export const getActiveLogBackground = (isActiveLog = true): string => {
	if (!isActiveLog) return '';
	return `background-color: ${orange[3]};`;
};
