import { act, renderHook } from '@testing-library/react';

import { useThemeSelection } from '../useThemeSelection';

const setThemeMock = jest.fn();
const setAutoSwitchMock = jest.fn();
let themeValue = 'dark';
let systemThemeValue: 'dark' | 'light' = 'light';

jest.mock('hooks/useDarkMode', () => ({
	__esModule: true,
	default: (): {
		theme: string;
		setTheme: jest.Mock;
		setAutoSwitch: jest.Mock;
		toggleTheme: jest.Mock;
		autoSwitch: boolean;
	} => ({
		theme: themeValue,
		setTheme: setThemeMock,
		setAutoSwitch: setAutoSwitchMock,
		toggleTheme: jest.fn(),
		autoSwitch: false,
	}),
	useThemeMode: (): {
		theme: string;
		setTheme: jest.Mock;
		setAutoSwitch: jest.Mock;
		toggleTheme: jest.Mock;
		autoSwitch: boolean;
	} => ({
		theme: themeValue,
		setTheme: setThemeMock,
		setAutoSwitch: setAutoSwitchMock,
		toggleTheme: jest.fn(),
		autoSwitch: false,
	}),
	useSystemTheme: (): 'dark' | 'light' => systemThemeValue,
	useIsDarkMode: (): boolean => themeValue === 'dark',
}));

const canAnimateMock = jest.fn();
const runTransitionMock = jest.fn();

jest.mock('utils/themeTransition', () => ({
	__esModule: true,
	canAnimateThemeTransition: (): boolean => canAnimateMock(),
	runThemeTransition: (cb: () => void): void => runTransitionMock(cb),
}));

describe('useThemeSelection', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		themeValue = 'dark';
		systemThemeValue = 'light';
		canAnimateMock.mockReturnValue(false);
		// Default behaviour: invoke the applyChange callback synchronously.
		runTransitionMock.mockImplementation((cb: () => void) => cb());
	});

	it('applies an explicit light theme without auto-switch', () => {
		themeValue = 'dark';
		const { result } = renderHook(() => useThemeSelection());

		act(() => result.current('light'));

		expect(setAutoSwitchMock).toHaveBeenCalledWith(false);
		expect(setThemeMock).toHaveBeenCalledWith('light');
	});

	it('applies an explicit dark theme without auto-switch', () => {
		themeValue = 'light';
		const { result } = renderHook(() => useThemeSelection());

		act(() => result.current('dark'));

		expect(setAutoSwitchMock).toHaveBeenCalledWith(false);
		expect(setThemeMock).toHaveBeenCalledWith('dark');
	});

	it('SYSTEM with a light system preference resolves to setTheme("light") + auto on', () => {
		themeValue = 'dark';
		systemThemeValue = 'light';
		const { result } = renderHook(() => useThemeSelection());

		act(() => result.current('auto'));

		expect(setAutoSwitchMock).toHaveBeenCalledWith(true);
		// Explicit resolved value is what keeps the wipe snapshot accurate;
		// see the comment in useThemeSelection for the failure mode.
		expect(setThemeMock).toHaveBeenCalledWith('light');
	});

	it('SYSTEM with a dark system preference resolves to setTheme("dark") + auto on', () => {
		themeValue = 'light';
		systemThemeValue = 'dark';
		const { result } = renderHook(() => useThemeSelection());

		act(() => result.current('auto'));

		expect(setAutoSwitchMock).toHaveBeenCalledWith(true);
		expect(setThemeMock).toHaveBeenCalledWith('dark');
	});

	it('invokes onApplied inside the same batch, after the state mutations', () => {
		themeValue = 'dark';
		const onApplied = jest.fn();
		const { result } = renderHook(() => useThemeSelection());

		act(() => result.current('light', onApplied));

		expect(onApplied).toHaveBeenCalledTimes(1);
		expect(setThemeMock.mock.invocationCallOrder[0]).toBeLessThan(
			onApplied.mock.invocationCallOrder[0],
		);
	});

	it('routes through runThemeTransition when the dark↔light state actually flips', () => {
		themeValue = 'dark';
		canAnimateMock.mockReturnValue(true);
		const { result } = renderHook(() => useThemeSelection());

		act(() => result.current('light'));

		expect(runTransitionMock).toHaveBeenCalledTimes(1);
		expect(setThemeMock).toHaveBeenCalledWith('light');
	});

	it('skips runThemeTransition when no dark↔light flip happens', () => {
		themeValue = 'dark';
		canAnimateMock.mockReturnValue(true);
		const { result } = renderHook(() => useThemeSelection());

		act(() => result.current('dark'));

		expect(runTransitionMock).not.toHaveBeenCalled();
		// applyChange still ran inline.
		expect(setThemeMock).toHaveBeenCalledWith('dark');
	});

	it('skips runThemeTransition when SYSTEM resolves to the currently-rendered theme', () => {
		themeValue = 'dark';
		systemThemeValue = 'dark';
		canAnimateMock.mockReturnValue(true);
		const { result } = renderHook(() => useThemeSelection());

		act(() => result.current('auto'));

		expect(runTransitionMock).not.toHaveBeenCalled();
		expect(setAutoSwitchMock).toHaveBeenCalledWith(true);
		expect(setThemeMock).toHaveBeenCalledWith('dark');
	});

	it('skips runThemeTransition when capability check is false even if the theme flips', () => {
		themeValue = 'dark';
		canAnimateMock.mockReturnValue(false);
		const { result } = renderHook(() => useThemeSelection());

		act(() => result.current('light'));

		expect(runTransitionMock).not.toHaveBeenCalled();
		expect(setThemeMock).toHaveBeenCalledWith('light');
	});
});
