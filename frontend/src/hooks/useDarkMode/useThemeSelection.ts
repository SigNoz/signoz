import { useCallback } from 'react';
import {
	canAnimateThemeTransition,
	runThemeTransition,
} from 'utils/themeTransition';

import useThemeMode, { useSystemTheme } from './index';
import { THEME_MODE, ThemeMode } from './constant';

type SelectTheme = (value: ThemeMode, onApplied?: () => void) => void;

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
			// differs from what we're currently rendering. For explicit LIGHT/DARK,
			// resolvedTargetIsDark is just (value === DARK).
			const resolvedTargetIsDark =
				value === THEME_MODE.SYSTEM
					? systemTheme === THEME_MODE.DARK
					: value === THEME_MODE.DARK;
			const isSystem = value === THEME_MODE.SYSTEM;

			// Always push the resolved LIGHT/DARK through setTheme synchronously so
			// the View Transition snapshot reflects the new theme. If we relied on
			// ThemeProvider's effect (setAutoSwitch → re-render → effect →
			// setThemeState), the flip wouldn't be guaranteed to run inside this
			// flushSync batch and the wipe would capture old → old, then snap.
			const resolvedTheme = resolvedTargetIsDark
				? THEME_MODE.DARK
				: THEME_MODE.LIGHT;

			// runThemeTransition needs a zero-arg callback, so this closure is
			// unavoidable. It allocates once per selection — cheap enough that
			// micro-optimising it would just obscure the flow.
			const apply = (): void => {
				setAutoSwitch(isSystem);
				setTheme(resolvedTheme);
				onApplied?.();
			};

			const willFlipDarkMode = resolvedTargetIsDark !== currentIsDark;
			if (!willFlipDarkMode || !canAnimateThemeTransition()) {
				apply();
				return;
			}

			runThemeTransition(apply);
		},
		[theme, systemTheme, setTheme, setAutoSwitch],
	);
}

export default useThemeSelection;
