import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { plannedDowntimeMocks } from './PlannedDowntime.stories.mocks';
import {
	openDeleteConfirm,
	openEditDowntime,
	openFromRow,
	openNewDowntime,
	openRecurringNewDowntime,
	searchWithNoResults,
	submitEmptyForm,
} from './__story_mockdata__/plannedDowntime.play';

import AlertList from '../../index';

type PlannedDowntimeArgs = PageStoryArgs<typeof plannedDowntimeMocks>;

const pageStory = storyMocks(plannedDowntimeMocks, { layout: 'app' });

/**
 * Windows that silence rules on a schedule, one off or recurring, with the rules
 * each window covers. Gated on authz permissions for planned downtime and the
 * alert rules it silences.
 *
 * Route: `/alerts?tab=Configuration&subTab=planned-downtime`.
 */
const meta = {
	title: 'Pages/Alerts/Planned Downtime/Overview',
	tags: ['authz', 'play'],
	component: AlertList,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<PlannedDowntimeArgs>;

export default meta;

type Story = StoryObj<PlannedDowntimeArgs>;

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
 * A viewer, who may list and read downtimes and rules but not change them: New
 * downtime is locked, and a row's Edit and Delete are locked in its menu.
 */
export const Viewer: Story = {
	args: {
		access: 'viewer',
		permissions: [
			'list:planned-maintenance',
			'read:planned-maintenance',
			'list:rule',
			'read:rule',
		],
	},
};

/** A downtime opened from its row: the form prefilled with its window and rules. */
export const OpenFromRow: Story = {
	play: openFromRow,
};

/** The form a downtime is scheduled in: the window, the repeat and the rules. */
export const NewDowntime: Story = {
	play: openNewDowntime,
};

/** The deletion confirmation opened from the first schedule's real row action. */
export const DeleteDowntimeConfirm: Story = {
	play: openDeleteConfirm,
};

/**
 * The first schedule opened for editing: the specific rules it silences sit
 * above the rule picker, each with its own remove button.
 */
export const EditDowntime: Story = {
	play: openEditDowntime,
};

/** The new-downtime form set to repeat weekly, which adds the days and duration. */
export const NewDowntimeRecurring: Story = {
	play: openRecurringNewDowntime,
};

/** A client-side search with no matching downtime schedule. */
export const SearchNoResults: Story = {
	play: searchWithNoResults,
};

/** The schedule list request failed. */
export const LoadError: Story = {
	args: { schedulesState: 'error' },
	// The mocked schedules request intentionally fails; the resulting console error
	// is the point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
};

/** The new-downtime form with its alert-rules request failed. */
export const RulesLoadError: Story = {
	args: { rulesState: 'error' },
	// The mocked rules request intentionally fails; the resulting console error is
	// the point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
	play: openNewDowntime,
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
	play: submitEmptyForm,
};
