/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';

import { countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import { CHANNEL_MAX, channelsResponse } from '../__story_mockdata__/alerts';
import { AlertListTabs } from '../types';

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
			'http://localhost/api/v1/channels',
			response.json(() => channelsResponse(values.channels)),
		),
	],
	config: () => ({ route: `/alerts?tab=${AlertListTabs.CHANNELS}` }),
});
