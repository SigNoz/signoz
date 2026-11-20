/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import {
	drawerLogsOf,
	listsOrdersSpan,
	type TracesArgs,
} from '../TracesModulePage.stories.mocks';
import { ORDERS_OPERATION, ORDERS_SPAN_ROWS, spanOperationAt } from './traces';

interface PlayContext {
	args: TracesArgs;
}

interface MountContext extends PlayContext {
	mount: () => Promise<unknown>;
}

/** The page fetches before it renders its rows, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

// The quick filters list the same span name, so the row is found by its test
// id; the table renders its rows a few at a time, so it waits for this one.
const findOrdersRow = (): Promise<HTMLElement> =>
	waitFor(async (): Promise<HTMLElement> => {
		const match = screen
			.getAllByTestId(/^traces-table-row-/)
			.find((candidate) => candidate.textContent?.includes(ORDERS_OPERATION));

		await expect(match).toBeDefined();

		return match as HTMLElement;
	}, untilLoaded);

const openDrawer = async (): Promise<HTMLElement> => {
	const row = await findOrdersRow();

	await userEvent.click(within(row).getByText(ORDERS_OPERATION));

	return screen.findByTestId('span-details-drawer');
};

const openLogsTab = async (): Promise<HTMLElement> => {
	const drawer = await openDrawer();

	await userEvent.click(within(drawer).getByRole('tab', { name: /Logs/ }));

	return drawer;
};

/** Mounts, then opens the Logs tab, unless the list has no span to open it on. */
const mountOnLogsTab = async (
	mount: MountContext['mount'],
	args: TracesArgs,
): Promise<HTMLElement | null> => {
	await mount();

	return listsOrdersSpan(args) ? openLogsTab() : null;
};

export const showsSpanDetails = async ({
	args,
}: PlayContext): Promise<void> => {
	if (!listsOrdersSpan(args)) {
		return;
	}

	const drawer = await openDrawer();

	// The percentage is read off the trace summary.
	if (args.traceSummary === 'found') {
		await expect(
			await within(drawer).findByText(
				/of total exec time/,
				undefined,
				untilLoaded,
			),
		).toBeVisible();
	}
};

export const openSpanDetails = async ({
	mount,
	args,
}: MountContext): Promise<void> => {
	await mount();
	await showsSpanDetails({ args });
};

export const hoverOrdersRow = async ({
	mount,
	args,
}: MountContext): Promise<void> => {
	await mount();

	if (!listsOrdersSpan(args)) {
		return;
	}

	await userEvent.hover(await findOrdersRow());

	await expect(await screen.findByTestId('span-row-open-trace')).toBeVisible();
};

export const showsSpanLogs = async ({
	mount,
	args,
}: MountContext): Promise<void> => {
	const drawer = await mountOnLogsTab(mount, args);

	if (!drawer || drawerLogsOf(args) !== 'logs') {
		return;
	}

	await expect(
		(
			await within(drawer).findAllByText(
				/payment provider timed out/,
				undefined,
				untilLoaded,
			)
		)[0],
	).toBeVisible();
};

export const showsTraceOnlyLogs = async ({
	mount,
	args,
}: MountContext): Promise<void> => {
	const drawer = await mountOnLogsTab(mount, args);

	if (!drawer || drawerLogsOf(args) !== 'trace-only') {
		return;
	}

	await expect(
		await within(drawer).findByText(
			'No logs found for selected span. View logs for the current trace.',
			undefined,
			untilLoaded,
		),
	).toBeVisible();
};

export const showsNoLogs = async ({
	mount,
	args,
}: MountContext): Promise<void> => {
	const drawer = await mountOnLogsTab(mount, args);

	if (!drawer || drawerLogsOf(args) !== 'none') {
		return;
	}

	await expect(
		await within(drawer).findByText(
			'No logs found for this trace.',
			undefined,
			untilLoaded,
		),
	).toBeVisible();
};

export const showsWithoutTraceSummary = async ({
	mount,
	args,
}: MountContext): Promise<void> => {
	const drawer = await mountOnLogsTab(mount, args);

	if (!drawer) {
		return;
	}

	if (drawerLogsOf(args) === 'span-empty') {
		await expect(
			await within(drawer).findByText(
				'No logs found for this span.',
				undefined,
				untilLoaded,
			),
		).toBeVisible();
	}

	if (args.traceSummary === 'not found') {
		await expect(
			within(drawer).queryByText(/of total exec time/),
		).not.toBeInTheDocument();
	}
};

export const showsTraceSummaryLoading = async ({
	mount,
	args,
}: MountContext): Promise<void> => {
	const drawer = await mountOnLogsTab(mount, args);

	if (!drawer || args.traceSummary !== 'loading') {
		return;
	}

	await expect(
		await screen.findByTestId('open-in-explorer-button'),
	).toHaveAttribute('aria-disabled', 'true');
};

export const showsLogsError = async ({
	mount,
	args,
}: MountContext): Promise<void> => {
	const drawer = await mountOnLogsTab(mount, args);

	if (!drawer || drawerLogsOf(args) !== 'error') {
		return;
	}

	await expect(
		await within(drawer).findByText(
			/Something went wrong/,
			undefined,
			untilLoaded,
		),
	).toBeVisible();
};

/** The row under the orders span is the one ArrowDown opens. */
export const stepToNextSpan = async ({
	mount,
	args,
}: MountContext): Promise<void> => {
	await mount();

	if (!listsOrdersSpan(args) || args.spans <= ORDERS_SPAN_ROWS) {
		return;
	}

	const drawer = await openDrawer();

	await userEvent.keyboard('{ArrowDown}');
	await expect(
		await within(drawer).findByText(
			spanOperationAt(ORDERS_SPAN_ROWS),
			undefined,
			untilLoaded,
		),
	).toBeVisible();
};
