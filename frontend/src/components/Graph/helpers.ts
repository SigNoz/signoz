import { themeColors } from 'constants/theme';

export const getAxisLabelColor = (currentTheme: string): string => {
	if (currentTheme === 'light') {
		return themeColors.black;
	}
	return themeColors.whiteCream;
};
