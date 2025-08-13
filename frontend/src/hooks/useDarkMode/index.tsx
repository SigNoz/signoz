import { theme as antdTheme } from 'antd';
import { ThemeConfig } from 'antd/es/config-provider/context';
import get from 'api/browser/localstorage/get';
import set from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import {
	createContext,
	Dispatch,
	ReactNode,
	SetStateAction,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';

import { THEME_MODE } from './constant';

export const ThemeContext = createContext({
	theme: THEME_MODE.DARK,
	toggleTheme: (): void => {},
	autoSwitch: false,
	setAutoSwitch: ((): void => {}) as Dispatch<SetStateAction<boolean>>,
});

// Hook to detect system theme preference
export const useSystemTheme = (): 'light' | 'dark' => {
	const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('dark');

	useEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

		const handler = (e: MediaQueryListEvent): void => {
			setSystemTheme(e.matches ? 'dark' : 'light');
		};

		mediaQuery.addEventListener('change', handler);
		return (): void => mediaQuery.removeEventListener('change', handler);
	}, []);

	return systemTheme;
};

export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
	const [theme, setTheme] = useState(get(LOCALSTORAGE.THEME) || THEME_MODE.DARK);
	const [autoSwitch, setAutoSwitch] = useState(
		get(LOCALSTORAGE.THEME_AUTO_SWITCH) === 'true',
	);
	const systemTheme = useSystemTheme();

	// Handle auto-switch functionality
	useEffect(() => {
		if (autoSwitch) {
			const newTheme = systemTheme === 'dark' ? THEME_MODE.DARK : THEME_MODE.LIGHT;
			if (newTheme !== theme) {
				setTheme(newTheme);
				set(LOCALSTORAGE.THEME, newTheme);
			}
		}
	}, [systemTheme, autoSwitch, theme]);

	// Save auto-switch preference
	useEffect(() => {
		set(LOCALSTORAGE.THEME_AUTO_SWITCH, autoSwitch.toString());
	}, [autoSwitch]);

	const toggleTheme = useCallback((): void => {
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
			autoSwitch,
			setAutoSwitch,
		}),
		[theme, toggleTheme, autoSwitch, setAutoSwitch],
	);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

interface ThemeProviderProps {
	children: ReactNode;
}

interface ThemeMode {
	theme: string;
	toggleTheme: () => void;
	autoSwitch: boolean;
	setAutoSwitch: Dispatch<SetStateAction<boolean>>;
}

export const useThemeMode = (): ThemeMode => {
	const { theme, toggleTheme, autoSwitch, setAutoSwitch } = useContext(
		ThemeContext,
	);

	return { theme, toggleTheme, autoSwitch, setAutoSwitch };
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
