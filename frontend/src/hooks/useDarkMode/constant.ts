export const THEME_MODE = {
	LIGHT: 'light',
	DARK: 'dark',
	SYSTEM: 'auto',
} as const;

export type ThemeMode = typeof THEME_MODE[keyof typeof THEME_MODE];
