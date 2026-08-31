/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

/**
 * The catch-all has no route of its own: it answers for whatever pathname the
 * `Switch` ran out of routes for, and it calls nothing.
 */
export const notFoundMocks = defineStoryMocks({
	controls: {},
	config: () => ({ route: '/no-such-page' }),
});
