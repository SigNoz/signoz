import { themeColors } from 'constants/theme';

export const getAxisLabelColor = (currentTheme: string): string => {
	switch (currentTheme) {
		case 'dark':
			return themeColors.whiteCream;
		case 'light':
			return themeColors.black;
		default:
			return themeColors.whiteCream;
	}
};
