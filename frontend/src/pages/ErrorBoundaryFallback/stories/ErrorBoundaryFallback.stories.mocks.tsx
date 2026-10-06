/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';

import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

/**
 * The screen every error boundary in the app falls back to. It calls nothing;
 * where its support button leads follows the License control.
 */
export const errorBoundaryFallbackMocks = defineStoryMocks({
	controls: {},
	config: () => ({ route: ROUTES.SOMETHING_WENT_WRONG }),
});
