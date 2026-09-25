/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	logsSavedViewsResponse,
	SAVED_VIEW_MAX,
	SAVED_VIEWS_PAGE_SIZE,
	savedViewWriteResponse,
} from './__story_mockdata__/savedViews';

const LIST = 'Views · list';

export const savedViewsMocks = defineStoryMocks({
	controls: {
		views: countControl('Saved views', {
			group: LIST,
			description: `The views the org saved for logs. Past ${SAVED_VIEWS_PAGE_SIZE} the table paginates.`,
			value: 4,
			max: SAVED_VIEW_MAX,
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v1/explorer/views',
			response.json(() => logsSavedViewsResponse(values.views)),
		),

		rest.put(
			'http://localhost/api/v1/explorer/views/:viewId',
			response.json(savedViewWriteResponse),
		),

		rest.delete(
			'http://localhost/api/v1/explorer/views/:viewId',
			response.json(savedViewWriteResponse),
		),
	],
	config: () => ({ route: ROUTES.LOGS_SAVE_VIEWS }),
});
