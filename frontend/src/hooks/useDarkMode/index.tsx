import { theme as antdTheme } from 'antd';
import { ThemeConfig } from 'antd/es/config-provider/context';
import get from 'api/browser/localstorage/get';
import set from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from 'react';

import { THEME_MODE } from './constant';

export const ThemeContext = createContext({
	theme: THEME_MODE.DARK,
	toggleTheme: () => {},
});

export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
	const [theme, setTheme] = useState(get(LOCALSTORAGE.THEME) || THEME_MODE.DARK);

	const toggleTheme = useCallback(() => {
		if (theme === THEME_MODE.LIGHT) {
			setTheme(THEME_MODE.DARK);
			set(LOCALSTORAGE.THEME, THEME_MODE.DARK);
		} else {
			setTheme(THEME_MODE.LIGHT);
			set(LOCALSTORAGE.THEME, THEME_MODE.LIGHT);
		}
		set(LOCALSTORAGE.THEME_ANALYTICS_V1, '');
	}, [theme]);

	const value = useMemo(
		() => ({
			theme,
			toggleTheme,
		}),
		[theme, toggleTheme],
	);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

interface ThemeProviderProps {
	children: ReactNode;
}

interface ThemeMode {
	theme: string;
	toggleTheme: () => void;
}

export const useThemeMode = (): ThemeMode => {
	const { theme, toggleTheme } = useContext(ThemeContext);

	return { theme, toggleTheme };
};

export const useIsDarkMode = (): boolean => {
	const { theme } = useContext(ThemeContext);

	return theme === THEME_MODE.DARK;
};

export const useThemeConfig = (): ThemeConfig => {
	const isDarkMode = useIsDarkMode();

	return {
		algorithm: isDarkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
		token: {
			borderRadius: 2,
			borderRadiusLG: 2,
			borderRadiusSM: 2,
			borderRadiusXS: 2,
			fontFamily: 'Inter',
			fontSize: 13,
			colorPrimary: '#4E74F8',
			colorBgBase: isDarkMode ? '#0B0C0E' : '#fff',
			colorBgContainer: isDarkMode ? '#121317' : '#fff',
			colorLink: '#4E74F8',
			colorPrimaryText: '#3F5ECC',
		},
		components: {
			Dropdown: {
				colorBgElevated: isDarkMode ? '#121317' : '#fff',
				controlItemBgHover: isDarkMode ? '#1D212D' : '#fff',
				colorText: isDarkMode ? '#C0C1C3' : '#121317',
				fontSize: 12,
			},
			Select: {
				colorBgElevated: isDarkMode ? '#121317' : '#fff',
				controlItemBgHover: isDarkMode ? '#1D212D' : '#fff',
				boxShadowSecondary: isDarkMode
					? '4px 10px 16px 2px rgba(0, 0, 0, 0.30)'
					: '#fff',
				colorText: isDarkMode ? '#C0C1C3' : '#121317',
				fontSize: 12,
			},
			Button: {
				paddingInline: 12,
				fontSize: 12,
			},
			Input: {
				colorBorder: isDarkMode ? '#1D212D' : '#E9E9E9',
			},
			Breadcrumb: {
				separatorMargin: 4,
			},
		},
	};
};

export default useThemeMode;
