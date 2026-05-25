import { useCallback } from 'react';
import {
	canAnimateThemeTransition,
	runThemeTransition,
} from 'utils/themeTransition';

import useThemeMode, { useSystemTheme } from './index';
import { THEME_MODE } from './constant';

type SelectTheme = (value: string, onApplied?: () => void) => void;

// Centralises the "apply a theme selection" flow used by MySettings and the
// command palette: figures out whether the visible (dark↔light) theme is
// actually flipping, applies the state change, and — when capable — wraps the
// change in a left→right view-transition wipe.
//
// `value` is one of THEME_MODE.{LIGHT,DARK,SYSTEM}; `onApplied` runs inside the
// same flushSync batch as the theme change (useful for, e.g., closing the
// command palette so its dismissal is part of the captured "new" snapshot).
export function useThemeSelection(): SelectTheme {
	const { theme, setTheme, setAutoSwitch } = useThemeMode();
	const systemTheme = useSystemTheme();

	return useCallback<SelectTheme>(
		(value, onApplied) => {
			const currentIsDark = theme === THEME_MODE.DARK;

			// When switching to SYSTEM, the visible theme flips iff the OS preference
			// differs from what we're currently rendering.
			const resolvedTargetIsDark =
				value === THEME_MODE.SYSTEM
					? systemTheme === THEME_MODE.DARK
					: value === THEME_MODE.DARK;
			const willFlipDarkMode = resolvedTargetIsDark !== currentIsDark;

			const applyChange = (): void => {
				if (value === THEME_MODE.SYSTEM) {
					setAutoSwitch(true);
				} else {
					setAutoSwitch(false);
					setTheme(value);
				}
				onApplied?.();
			};

			if (!willFlipDarkMode || !canAnimateThemeTransition()) {
				applyChange();
				return;
			}

			runThemeTransition(applyChange);
		},
		[theme, systemTheme, setTheme, setAutoSwitch],
	);
}

export default useThemeSelection;
