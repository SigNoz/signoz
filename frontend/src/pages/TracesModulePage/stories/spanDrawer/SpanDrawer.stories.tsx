import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { tracesMocks } from '../TracesModulePage.stories.mocks';

import TracesModulePage from '../../TracesModulePage';

type TracesArgs = PageStoryArgs<typeof tracesMocks>;

const pageStory = storyMocks(tracesMocks, { layout: 'app' });

/**
 * The span details drawer the explorer list opens on a row, one story per state
 * of its trace summary and its Logs tab. Every story opens the same failing
 * span; the Trace summary and Span logs controls pick what the drawer gets.
 *
 * Route: `/traces-explorer`.
 */
const meta = {
	title: 'Pages/Traces/Explorer/Span Drawer',
	tags: ['play'],
	component: TracesModulePage,
	...pageStory,
	parameters: { ...pageStory.parameters },
	args: { spanDrawer: true },
} satisfies Meta<TracesArgs>;

export default meta;

type Story = StoryObj<TracesArgs>;

/** The page fetches before it renders its rows, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

// The quick filters list the same span name, so the row is found by its test
// id; the table renders its rows a few at a time, so it waits for this one.
const openDrawer = async (): Promise<HTMLElement> => {
	const row = await waitFor((): HTMLElement => {
		const match = screen
			.getAllByTestId(/^traces-table-row-/)
			.find((candidate) => candidate.textContent?.includes('POST /api/orders'));

		expect(match).toBeDefined();

		return match as HTMLElement;
	}, untilLoaded);

	await userEvent.click(within(row).getByText('POST /api/orders'));

	return screen.findByTestId('span-details-drawer');
};

const openLogsTab = async (): Promise<HTMLElement> => {
	const drawer = await openDrawer();

	await userEvent.click(within(drawer).getByRole('tab', { name: /Logs/ }));

	return drawer;
};

/**
 * The drawer on a failing span: its summary with % exec time, attributes, the
 * exception event and a linked span, with up and down stepping through the page.
 */
export const Default: Story = {
	play: async ({ mount }): Promise<void> => {
		await mount();
		const drawer = await openDrawer();

		await expect(
			await within(drawer).findByText(
				/of total exec time/,
				undefined,
				untilLoaded,
			),
		).toBeVisible();
	},
};

/** The Logs tab with the span's logs, between the logs just before and after them. */
export const Logs: Story = {
	args: { spanLogs: 'span' },
	play: async ({ mount }): Promise<void> => {
		await mount();
		const drawer = await openLogsTab();

		await expect(
			(
				await within(drawer).findAllByText(
					/payment provider timed out/,
					undefined,
					untilLoaded,
				)
			)[0],
		).toBeVisible();
	},
};

/** The span has no logs of its own but its trace does, so the tab points to the trace's. */
export const TraceOnlyLogs: Story = {
	args: { spanLogs: 'trace only' },
	play: async ({ mount }): Promise<void> => {
		await mount();
		const drawer = await openLogsTab();

		await expect(
			await within(drawer).findByText(
				'No logs found for selected span. View logs for the current trace.',
				undefined,
				untilLoaded,
			),
		).toBeVisible();
	},
};

/** Neither the span nor its trace has logs. */
export const NoLogs: Story = {
	args: { spanLogs: 'none' },
	play: async ({ mount }): Promise<void> => {
		await mount();
		const drawer = await openLogsTab();

		await expect(
			await within(drawer).findByText(
				'No logs found for this trace.',
				undefined,
				untilLoaded,
			),
		).toBeVisible();
	},
};

/**
 * The trace summary 404s, so the drawer speaks only for the span: no % exec
 * time, logs over the span's own window and no trace-wide logs check.
 */
export const WithoutTraceSummary: Story = {
	args: { traceSummary: 'not found', spanLogs: 'none' },
	play: async ({ mount }): Promise<void> => {
		await mount();
		const drawer = await openLogsTab();

		await expect(
			await within(drawer).findByText(
				'No logs found for this span.',
				undefined,
				untilLoaded,
			),
		).toBeVisible();
		await expect(
			within(drawer).queryByText(/of total exec time/),
		).not.toBeInTheDocument();
	},
};

/** The trace summary never answers: the Logs tab waits and its explorer link is off. */
export const TraceSummaryLoading: Story = {
	args: { traceSummary: 'loading' },
	play: async ({ mount }): Promise<void> => {
		await mount();
		await openLogsTab();

		await expect(
			await screen.findByTestId('open-in-explorer-button'),
		).toHaveAttribute('aria-disabled', 'true');
	},
};

/** The log queries fail while the rest of the drawer renders. */
export const LogsError: Story = {
	args: { spanLogs: 'error' },
	play: async ({ mount }): Promise<void> => {
		await mount();
		const drawer = await openLogsTab();

		await expect(
			await within(drawer).findByText(
				/Something went wrong/,
				undefined,
				untilLoaded,
			),
		).toBeVisible();
	},
};
