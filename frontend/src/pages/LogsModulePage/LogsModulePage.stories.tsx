import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { logsMocks } from './LogsModulePage.stories.mocks';

import LogsModulePage from './LogsModulePage';

type LogsArgs = PageStoryArgs<typeof logsMocks>;

const pageStory = storyMocks(logsMocks);

/**
 * The logs explorer: the query builder, the list, the frequency chart and the log
 * detail drawer, with quick filters and saved views beside them.
 *
 * Route: `/logs/logs-explorer`.
 */
const meta = {
	title: 'Pages/Logs/Explorer',
	tags: ['play'],
	component: LogsModulePage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<LogsArgs>;

export default meta;

type Story = StoryObj<LogsArgs>;

/** The page fetches before it renders a row, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/** Opening a log is what the drawer is for, and the first row will do. */
const openFirstLog = async (canvasElement: HTMLElement): Promise<void> => {
	const [row] = await within(canvasElement).findAllByTestId(
		/^logs-table-row-/,
		undefined,
		untilLoaded,
	);

	// The list hangs its click handler off the cells rather than the row, so a
	// click on the row itself opens nothing.
	const [, timestamp] = within(row).getAllByRole('cell');

	await userEvent.click(timestamp);
	await screen.findByTestId('log-detail-drawer', undefined, untilLoaded);
};

/**
 * The explorer on its list view: quick filters down the left, the frequency
 * chart over a page of log lines across every severity, and the org's saved
 * views in the view picker.
 */
export const Default: Story = {};

/** A workspace with logs ingesting but nothing matching the query. */
export const NoLogs: Story = {
	args: { logs: 0 },
};

/** Counts per severity over the selected range instead of the lines themselves. */
export const TimeseriesView: Story = {
	args: { view: 'timeseries' },
};

/**
 * A service that logs JSON, with `use_json_body` on: the body is an object the
 * backend already parsed, and its keys can be filtered on as `body.x`.
 */
export const JsonBody: Story = {
	args: { jsonBody: true },
};

/** One log opened up: its own fields, then the resource that sent it. */
export const LogDetails: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openFirstLog(canvasElement);
	},
};

/** The logs either side of the one that was opened, on the same filters. */
export const LogDetailsContext: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openFirstLog(canvasElement);
		await userEvent.click(
			await screen.findByText('Context', undefined, untilLoaded),
		);
	},
};
