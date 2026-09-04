/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';

import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

/**
 * The page is a tab strip over one tab, and the tab's body is a placeholder:
 * nothing here is fetched, so there is nothing to turn.
 */
export const logsSettingsMocks = defineStoryMocks({
	controls: {},
	config: () => ({ route: ROUTES.LOGS_INDEX_FIELDS }),
});
