import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { plannedDowntimeMocks } from './PlannedDowntime.stories.mocks';
import { FIRST_DOWNTIME_NAME } from './__story_mockdata__/plannedDowntime';

import AlertList from '../index';

type PlannedDowntimeArgs = PageStoryArgs<typeof plannedDowntimeMocks>;

const pageStory = storyMocks(plannedDowntimeMocks);

/**
 * Windows that silence rules on a schedule, one off or recurring, with the rules
 * each window covers.
 *
 * Route: `/alerts?tab=Configuration&subTab=PlannedDowntime`.
 */
const meta = {
	title: 'Pages/Alerts/Planned Downtime',
	tags: ['role-gated', 'play'],
	component: AlertList,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<PlannedDowntimeArgs>;

export default meta;

type Story = StoryObj<PlannedDowntimeArgs>;

/** The page fetches before it renders a row, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/**
 * The windows where alerting is held back: what is running now, what is
 * scheduled, and which rules each one silences.
 */
export const Default: Story = {};

/** A workspace that has never scheduled a downtime. */
export const NoDowntimes: Story = {
	args: { schedules: 0 },
};

/**
 * A viewer: the edit and delete actions on a row and the New downtime button
 * are gone.
 */
export const Viewer: Story = {
	args: { access: 'viewer' },
};

/** A downtime opened up: who scheduled it, the window, and what it silences. */
export const Expanded: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await userEvent.click(
			await canvas.findByText(FIRST_DOWNTIME_NAME, undefined, untilLoaded),
		);
		await canvas.findByText(/alerts silenced/i);
	},
};

/** The form a downtime is scheduled in: the window, the repeat and the rules. */
export const NewDowntime: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				/new downtime/i,
				undefined,
				untilLoaded,
			),
		);
		await screen.findByText(/new planned downtime/i);
	},
};
