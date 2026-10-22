/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';

import { countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	CHANNEL_MAX,
	notificationChannelByRowId,
	notificationChannelsPage,
} from '../../stories/__story_mockdata__/alerts';
import { AlertListTabs } from '../../types';

const LIST = 'Channels · list';

export const channelsMocks = defineStoryMocks({
	controls: {
		channels: countControl('Notification channels', {
			group: LIST,
			description: 'One per channel type, in the order the seeds declare them.',
			value: 5,
			max: CHANNEL_MAX,
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v2/notification_channels/:id',
			response.json((req) => notificationChannelByRowId(String(req.params.id))),
		),

		rest.get(
			'http://localhost/api/v2/notification_channels',
			response.json((req) =>
				notificationChannelsPage(values.channels, req.url.searchParams),
			),
		),
	],
	config: () => ({ route: `/alerts?tab=${AlertListTabs.CHANNELS}` }),
});
