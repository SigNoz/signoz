import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';

import { type LiveLogsArgs, liveLogsMocks } from './LiveLogs.stories.mocks';
import {
	copyLiveLogLink,
	openLiveLogDetails,
	tailLive,
} from './__story_mockdata__/liveLogs.play';

import LogsModulePage from '../../LogsModulePage';

const pageStory = storyMocks(liveLogsMocks, { layout: 'app' });

/**
 * Live tail: the explorer following a filter as lines arrive, over the log
 * stream at `/api/v3/logs/livetail` rather than a query. It is a mode of the
 * explorer rather than a page of its own, and nothing in the URL says it is on,
 * so every story here turns it on the way someone does.
 *
 * Route: `/logs/logs-explorer`.
 */
const meta = {
	title: 'Pages/Logs/Live Tail',
	tags: ['play'],
	component: LogsModulePage,
	play: tailLive,
	...pageStory,
	// The stream mock answers in one piece, so the polyfill reads its end as a
	// dropped connection and logs the error it would on any reconnect; that is the
	// state under test, not a regression.
	parameters: { ...pageStory.parameters, allowConsoleErrors: true },
} satisfies Meta<LiveLogsArgs>;

export default meta;

type Story = StoryObj<LiveLogsArgs>;

/**
 * The explorer live-tailing a service: the lines the connection has delivered,
 * newest on top, with the pause control beside the time picker.
 */
export const Default: Story = {};

/** Connected with nothing through yet, which is where every live tail starts. */
export const Waiting: Story = {
	args: { liveLogs: 0 },
};

/**
 * A JSON-logging service tailed live: object bodies as JSON, and a body holding
 * only `message` as its text, the same as the explorer shows it.
 */
export const JsonBody: Story = {
	args: { jsonBody: true },
};

/** Row actions render on hover, so a streamed line is hovered before its copy link is pressed. */
export const LogLinkCopiedToast: Story = {
	play: copyLiveLogLink,
};

/** A streamed line opened in the log detail drawer. */
export const LiveLogDetails: Story = {
	play: openLiveLogDetails,
};
