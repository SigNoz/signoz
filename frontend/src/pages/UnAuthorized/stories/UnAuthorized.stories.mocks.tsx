/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';

import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

/**
 * The page calls nothing: what it says is decided by the role, which the Access
 * control already owns.
 */
export const unAuthorizedMocks = defineStoryMocks({
	controls: {},
	config: () => ({ route: ROUTES.UN_AUTHORIZED }),
});
