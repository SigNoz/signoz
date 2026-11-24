import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { alertHistoryMocks } from '../AlertHistory.stories.mocks';
import {
	expectRuleDenied,
	expectTelemetryRefused,
} from '../__story_mockdata__/alertHistory.play';

import AlertList from '../../../index';

type AlertHistoryArgs = PageStoryArgs<typeof alertHistoryMocks>;

const pageStory = storyMocks(alertHistoryMocks, { layout: 'app' });

/**
 * One rule's history with access taken away. `read` on the rule decides whether
 * the page opens and covers the stats and the status graph. The timeline, the
 * top contributors and the filter suggestions also read the telemetry the rule
 * queries, which only the server checks.
 *
 * Route: `/alerts/history?ruleId=...`.
 */
const meta = {
	title: 'Pages/Alerts/History/Authz',
	tags: ['authz', 'play'],
	component: AlertList,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<AlertHistoryArgs>;

export default meta;

type Story = StoryObj<AlertHistoryArgs>;

/** The full-page denial takes the page's place. */
export const NoRead: Story = {
	args: { revoked: ['read:rule'] },
	play: expectRuleDenied,
};

/**
 * A role that reads the rule but not its logs: the stats stay, the timeline and
 * the top contributors name the refused permission, and the filter suggests
 * nothing rather than erroring.
 */
export const TelemetryDenied: Story = {
	args: { telemetryAccess: 'denied' },
	// The mocked history requests intentionally fail; the resulting console
	// errors are the point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
	play: expectTelemetryRefused,
};
