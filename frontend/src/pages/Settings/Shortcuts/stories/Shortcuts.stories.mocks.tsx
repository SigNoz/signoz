/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';

import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

/**
 * The tab reads its rows from `pages/Shortcuts/utils`, so it has no endpoint and
 * no knob of its own: what the panel offers here is the shell around it.
 */
export const shortcutsMocks = defineStoryMocks({
	controls: {},
	config: () => ({ route: ROUTES.SHORTCUTS }),
});
