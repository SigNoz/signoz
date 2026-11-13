/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

interface MountContext {
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
			.find((candidate) => candidate.textContent?.includes('POST /api/orders'));

		await expect(match).toBeDefined();

		return match as HTMLElement;
	}, untilLoaded);

const openDrawer = async (): Promise<HTMLElement> => {
	const row = await findOrdersRow();

	await userEvent.click(within(row).getByText('POST /api/orders'));

	return screen.findByTestId('span-details-drawer');
};

const openLogsTab = async (): Promise<HTMLElement> => {
	const drawer = await openDrawer();

	await userEvent.click(within(drawer).getByRole('tab', { name: /Logs/ }));

	return drawer;
};

export const showsSpanDetails = async (): Promise<void> => {
	const drawer = await openDrawer();

	await expect(
		await within(drawer).findByText(/of total exec time/, undefined, untilLoaded),
	).toBeVisible();
};

export const openSpanDetails = async ({
	mount,
}: MountContext): Promise<void> => {
	await mount();
	await showsSpanDetails();
};

export const hoverOrdersRow = async ({
	mount,
}: MountContext): Promise<void> => {
	await mount();
	await userEvent.hover(await findOrdersRow());

	await expect(await screen.findByTestId('span-row-open-trace')).toBeVisible();
};

export const showsSpanLogs = async ({ mount }: MountContext): Promise<void> => {
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
};

export const showsTraceOnlyLogs = async ({
	mount,
}: MountContext): Promise<void> => {
	await mount();
	const drawer = await openLogsTab();

	await expect(
		await within(drawer).findByText(
			'No logs found for selected span. View logs for the current trace.',
			undefined,
			untilLoaded,
		),
	).toBeVisible();
};

export const showsNoLogs = async ({ mount }: MountContext): Promise<void> => {
	await mount();
	const drawer = await openLogsTab();

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
}: MountContext): Promise<void> => {
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
};

export const showsTraceSummaryLoading = async ({
	mount,
}: MountContext): Promise<void> => {
	await mount();
	await openLogsTab();

	await expect(
		await screen.findByTestId('open-in-explorer-button'),
	).toHaveAttribute('aria-disabled', 'true');
};

export const showsLogsError = async ({
	mount,
}: MountContext): Promise<void> => {
	await mount();
	const drawer = await openLogsTab();

	await expect(
		await within(drawer).findByText(
			/Something went wrong/,
			undefined,
			untilLoaded,
		),
	).toBeVisible();
};
