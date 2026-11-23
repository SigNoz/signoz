import type { Dispatch, ReactNode, SetStateAction } from 'react';
import {
	// eslint-disable-next-line no-restricted-imports
	createContext,
	useCallback,
	// eslint-disable-next-line no-restricted-imports
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';
import type { ThemeConfig } from 'antd';
import { theme as antdTheme } from 'antd';
import get from 'api/browser/localstorage/get';
import set from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';

import { THEME_MODE } from './constant';

// antd tokens take literal colours, not CSS variables: these mirror the dark
// design tokens named next to each value.
const DARK_FIELD: ThemeConfig['token'] = {
	colorBgContainer: 'rgba(236, 238, 242, 0.035)', // --input-background
	colorBorder: 'rgba(236, 238, 242, 0.093)', // --l2-border
	colorTextPlaceholder: '#747b8b', // --l3-foreground
};

const DARK_ROWS: ThemeConfig['token'] = {
	controlItemBgHover: 'rgba(236, 238, 242, 0.07)', // --dropdown-item-background-hover
	controlItemBgActive: 'rgba(78, 116, 248, 0.16)', // --primary-background at 16%
};

// Translucent: styles.scss blurs what is behind these popups.
const DARK_POPUP: ThemeConfig['token'] = {
	...DARK_ROWS,
	colorBgElevated: 'rgba(35, 38, 46, 0.6)', // --surface-3
};

export const ThemeContext = createContext({
	theme: THEME_MODE.DARK,
	toggleTheme: (): void => {},
	autoSwitch: false,
	setAutoSwitch: ((): void => {}) as Dispatch<SetStateAction<boolean>>,
	setTheme: ((): void => {}) as Dispatch<SetStateAction<string>>,
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
	const [theme, setThemeState] = useState(
		get(LOCALSTORAGE.THEME) || THEME_MODE.DARK,
	);
	const [autoSwitch, setAutoSwitch] = useState(
		get(LOCALSTORAGE.THEME_AUTO_SWITCH) === 'true',
	);
	const systemTheme = useSystemTheme();

	// Handle auto-switch functionality
	useEffect(() => {
		if (autoSwitch) {
			const newTheme = systemTheme === 'dark' ? THEME_MODE.DARK : THEME_MODE.LIGHT;
			if (newTheme !== theme) {
				setThemeState(newTheme);
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
			setThemeState(THEME_MODE.DARK);
			set(LOCALSTORAGE.THEME, THEME_MODE.DARK);
		} else {
			setThemeState(THEME_MODE.LIGHT);
			set(LOCALSTORAGE.THEME, THEME_MODE.LIGHT);
		}
		set(LOCALSTORAGE.THEME_ANALYTICS_V1, '');
	}, [theme]);

	const setTheme = useCallback(
		(newTheme: SetStateAction<string>): void => {
			const themeValue =
				typeof newTheme === 'function' ? newTheme(theme) : newTheme;
			setThemeState(themeValue);
			set(LOCALSTORAGE.THEME, themeValue);
		},
		[theme],
	);

	const value = useMemo(
		() => ({
			theme,
			toggleTheme,
			autoSwitch,
			setAutoSwitch,
			setTheme,
		}),
		[theme, toggleTheme, autoSwitch, setAutoSwitch, setTheme],
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
	setTheme: (newTheme: string) => void;
}

export const useThemeMode = (): ThemeMode => {
	const { theme, toggleTheme, autoSwitch, setAutoSwitch, setTheme } =
		useContext(ThemeContext);

	return { theme, toggleTheme, autoSwitch, setAutoSwitch, setTheme };
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
				colorBgElevated: '#fff',
				controlItemBgHover: '#fff',
				...(isDarkMode && { colorBgElevated: '#121317', ...DARK_ROWS }),
				colorText: isDarkMode ? '#C0C1C3' : '#121317',
				fontSize: 12,
			},
			Select: {
				colorBgElevated: '#fff',
				controlItemBgHover: '#fff',
				...(isDarkMode && { ...DARK_FIELD, ...DARK_POPUP }),
				boxShadowSecondary: isDarkMode
					? '4px 10px 16px 2px rgba(0, 0, 0, 0.30)'
					: '#fff',
				colorText: isDarkMode ? '#C0C1C3' : '#121317',
				fontSize: 12,
			},
			Button: {
				paddingInline: 12,
				fontSize: 12,
				defaultShadow: 'none',
				primaryShadow: 'none',
				dangerShadow: 'none',
				...(isDarkMode && {
					defaultBg: 'rgba(236, 238, 242, 0.04)', // --secondary-background
					defaultBorderColor: 'rgba(236, 238, 242, 0.093)', // --l2-border
				}),
			},
			Input: {
				colorBorder: '#E9E9E9',
				...(isDarkMode && DARK_FIELD),
			},
			InputNumber: { ...(isDarkMode && DARK_FIELD) },
			DatePicker: { ...(isDarkMode && { ...DARK_FIELD, ...DARK_POPUP }) },
			Breadcrumb: {
				separatorMargin: 4,
			},
		},
	};
};

export default useThemeMode;
