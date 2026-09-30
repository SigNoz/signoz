import { useEffect, useState } from 'react';
import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events';
import { addons } from 'storybook/preview-api';

import type { StoryTheme } from '../types';

const DEFAULT_THEME: StoryTheme = 'dark';

const isTheme = (value: unknown): value is StoryTheme =>
	value === 'dark' || value === 'light';

/**
 * The theme the toolbar is on, for a docs entry that has no story attached.
 *
 * Such an entry never runs the preview loaders or the decorators, which is where
 * every other part of the harness reads `globals.theme`, so the value has to come
 * off the channel the manager pushes it down. `SET_GLOBALS` is emitted while the
 * preview boots, before this can subscribe, so the initial value is parsed out of
 * the iframe's own `globals` query param (`theme:light`, `;`-separated).
 */
const readThemeFromUrl = (): StoryTheme => {
	const globals = new URLSearchParams(window.location.search).get('globals');
	const theme = globals
		?.split(';')
		.map((entry) => entry.split(':'))
		.find(([key]) => key === 'theme')?.[1];

	return isTheme(theme) ? theme : DEFAULT_THEME;
};

export function useDocsTheme(): StoryTheme {
	const [theme, setTheme] = useState<StoryTheme>(readThemeFromUrl);

	useEffect(() => {
		const channel = addons.getChannel();
		const onGlobals = ({
			globals,
		}: {
			globals?: Record<string, unknown>;
		}): void => {
			if (isTheme(globals?.theme)) {
				setTheme(globals.theme);
			}
		};

		channel.on(SET_GLOBALS, onGlobals);
		channel.on(GLOBALS_UPDATED, onGlobals);

		return (): void => {
			channel.off(SET_GLOBALS, onGlobals);
			channel.off(GLOBALS_UPDATED, onGlobals);
		};
	}, []);

	return theme;
}
