import { act, renderHook } from '@testing-library/react';

import {
	ThemeProvider,
	useIsDarkMode,
	useSystemTheme,
	useThemeMode,
} from '../index';

// Mock localStorage
const localStorageMock = {
	getItem: jest.fn(),
	setItem: jest.fn(),
	clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
});

// Helper function to create matchMedia mock
const createMatchMediaMock = (prefersDark: boolean): jest.Mock =>
	jest.fn().mockImplementation((query: string) => ({
		matches:
			query === '(prefers-color-scheme: dark)' ? prefersDark : !prefersDark,
		media: query,
		onchange: null,
		addListener: jest.fn(),
		removeListener: jest.fn(),
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn(),
	}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: createMatchMediaMock(true), // Default to dark theme
});

describe('useDarkMode', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		localStorageMock.getItem.mockReturnValue(null);
	});

	describe('useSystemTheme', () => {
		it('should return dark theme by default', () => {
			const { result } = renderHook(() => useSystemTheme());
			expect(result.current).toBe('dark');
		});

		it('should return light theme when system prefers light', () => {
			Object.defineProperty(window, 'matchMedia', {
				writable: true,
				value: createMatchMediaMock(false), // Light theme
			});

			const { result } = renderHook(() => useSystemTheme());
			expect(result.current).toBe('light');
		});
	});

	describe('ThemeProvider', () => {
		it('should provide theme context with default values', () => {
			const wrapper = ({
				children,
			}: {
				children: React.ReactNode;
			}): JSX.Element => <ThemeProvider>{children}</ThemeProvider>;

			const { result } = renderHook(() => useThemeMode(), { wrapper });

			expect(result.current.theme).toBe('dark');
			expect(typeof result.current.toggleTheme).toBe('function');
			expect(result.current.autoSwitch).toBe(false);
			expect(typeof result.current.setAutoSwitch).toBe('function');
		});

		it('should load theme from localStorage', () => {
			localStorageMock.getItem.mockImplementation((key: string) => {
				if (key === 'THEME') return 'light';
				if (key === 'THEME_AUTO_SWITCH') return 'true';
				return null;
			});

			const wrapper = ({
				children,
			}: {
				children: React.ReactNode;
			}): JSX.Element => <ThemeProvider>{children}</ThemeProvider>;

			const { result } = renderHook(() => useThemeMode(), { wrapper });

			expect(result.current.theme).toBe('light');
			expect(result.current.autoSwitch).toBe(true);
		});

		it('should toggle theme correctly', () => {
			const wrapper = ({
				children,
			}: {
				children: React.ReactNode;
			}): JSX.Element => <ThemeProvider>{children}</ThemeProvider>;

			const { result } = renderHook(() => useThemeMode(), { wrapper });

			act(() => {
				result.current.toggleTheme();
			});

			expect(result.current.theme).toBe('light');
			expect(localStorageMock.setItem).toHaveBeenCalledWith('THEME', 'light');
		});

		it('should handle auto-switch functionality', () => {
			// Mock system theme as light
			Object.defineProperty(window, 'matchMedia', {
				writable: true,
				value: createMatchMediaMock(false), // Light theme
			});

			const wrapper = ({
				children,
			}: {
				children: React.ReactNode;
			}): JSX.Element => <ThemeProvider>{children}</ThemeProvider>;

			const { result } = renderHook(() => useThemeMode(), { wrapper });

			act(() => {
				result.current.setAutoSwitch(true);
			});

			expect(result.current.autoSwitch).toBe(true);
			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				'THEME_AUTO_SWITCH',
				'true',
			);
		});
	});

	describe('useIsDarkMode', () => {
		it('should return true for dark theme', () => {
			localStorageMock.getItem.mockReturnValue('dark');

			const wrapper = ({
				children,
			}: {
				children: React.ReactNode;
			}): JSX.Element => <ThemeProvider>{children}</ThemeProvider>;

			const { result } = renderHook(() => useIsDarkMode(), { wrapper });
			expect(result.current).toBe(true);
		});

		it('should return false for light theme', () => {
			localStorageMock.getItem.mockReturnValue('light');

			const wrapper = ({
				children,
			}: {
				children: React.ReactNode;
			}): JSX.Element => <ThemeProvider>{children}</ThemeProvider>;

			const { result } = renderHook(() => useIsDarkMode(), { wrapper });
			expect(result.current).toBe(false);
		});
	});
});
