import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { plannedDowntimeMocks } from './PlannedDowntime.stories.mocks';
import { FIRST_DOWNTIME_NAME } from './__story_mockdata__/plannedDowntime';

import AlertList from '../../index';

type PlannedDowntimeArgs = PageStoryArgs<typeof plannedDowntimeMocks>;

const pageStory = storyMocks(plannedDowntimeMocks, { layout: 'app' });

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

/** The deletion confirmation opened from the first schedule's real row action. */
export const DeleteDowntimeConfirm: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const action = (
			await within(canvasElement).findByText(
				FIRST_DOWNTIME_NAME,
				undefined,
				untilLoaded,
			)
		)
			.closest('.header-content')
			// The row action holds edit then delete, neither of them labelled.
			?.querySelectorAll('.action-btn svg')[1];

		if (!action) {
			throw new Error('Downtime delete action did not render');
		}

		await userEvent.click(action);
		// The modal titles itself and its confirm button the same.
		await screen.findByRole('button', { name: 'Delete Schedule' });
	},
};

/** A client-side search with no matching downtime schedule. */
export const SearchNoResults: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);
		const search = await canvas.findByPlaceholderText(
			'Search for a planned downtime...',
			undefined,
			untilLoaded,
		);

		await userEvent.type(search, 'no matching downtime');
		await canvas.findByRole('table');
	},
};

/** The schedule list request failed. */
export const LoadError: Story = {
	args: { schedulesState: 'error' },
};

/** The new-downtime form with its alert-rules request failed. */
export const RulesLoadError: Story = {
	args: { rulesState: 'error' },
	play: NewDowntime.play,
};

/** A recurring schedule exposes its recurrence and duration treatment. */
export const RecurringSchedule: Story = {
	args: { downtimeKind: 'recurring' },
};

/** A schedule currently in effect. */
export const ActiveNow: Story = {
	args: { schedules: 1 },
};

/** Native form validation after attempting to save an empty downtime. */
export const FormValidationError: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await NewDowntime.play?.({ canvasElement } as never);
		await userEvent.click(
			await screen.findByRole('button', { name: 'Add downtime schedule' }),
		);
		await screen.findByText('Please enter Name');
	},
};
