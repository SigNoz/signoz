import { THEME_MODE } from 'hooks/useDarkMode/constant';

import type { StoryTheme } from '../types';

export const applyThemeBodyClass = (theme: StoryTheme): void => {
	const isDarkMode = theme === THEME_MODE.DARK;

	document.body.dataset.theme = 'default';
	document.body.classList.toggle('darkMode', isDarkMode);
	document.body.classList.toggle('dark', isDarkMode);
	document.body.classList.toggle('lightMode', !isDarkMode);
};
