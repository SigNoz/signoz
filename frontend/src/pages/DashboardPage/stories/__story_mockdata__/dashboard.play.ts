/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import {
	blurActiveElement,
	findMonacoEditor,
} from '@/storybook/play/monacoEditor';

import { dashboardDurationError } from '../../DashboardContainer/utils/dashboardDuration';
import {
	canDeleteDashboard,
	canEditSections,
	clickPanelAction,
	clickSectionAction,
	type DashboardPageArgs,
	hasPanel,
	hasPanelSearch,
	openActionsMenu,
	openJsonEditor,
	openSettings,
	PAGE_LOAD,
	showsDashboard,
} from '../DashboardPage.stories.mocks';
import type { PanelId } from './dashboard';

interface DashboardPlayContext {
	canvasElement: HTMLElement;
	args: DashboardPageArgs;
}

const findDefaultTimeRange = async ({
	canvasElement,
	args,
}: DashboardPlayContext): Promise<HTMLElement | null> => {
	if (args.locked) {
		await waitFor(
			() =>
				expect(within(canvasElement).getByTestId('show-drawer')).toHaveAttribute(
					'aria-disabled',
					'true',
				),
			PAGE_LOAD,
		);
		return null;
	}
	const panel = await openSettings(canvasElement);

	return within(panel).findByTestId(
		'dashboard-default-time-range',
		{},
		PAGE_LOAD,
	);
};

export const showDefaultTimeRange = async (
	context: DashboardPlayContext,
): Promise<void> => {
	await findDefaultTimeRange(context);
};

const isSliding = (element: HTMLElement): boolean => {
	for (let node = element.parentElement; node; node = node.parentElement) {
		if (getComputedStyle(node).transform !== 'none') {
			return true;
		}
	}

	return false;
};

export const openDefaultTimeRange = async (
	context: DashboardPlayContext,
): Promise<void> => {
	const select = await findDefaultTimeRange(context);
	if (!select) {
		return;
	}

	await waitFor(() => expect(isSliding(select)).toBe(false), PAGE_LOAD);
	await userEvent.click(select);
	await screen.findByRole('listbox');
};

export const showJsonEditor = async ({
	canvasElement,
	args,
}: DashboardPlayContext): Promise<void> => {
	if (!showsDashboard(args)) {
		return;
	}

	await openJsonEditor(canvasElement);
	await findMonacoEditor();
	blurActiveElement();
};

export const hoverJsonValidation = async ({
	canvasElement,
	args,
}: DashboardPlayContext): Promise<void> => {
	await openJsonEditor(canvasElement);
	await findMonacoEditor();
	const validation = await screen.findByTestId('json-editor-validation');

	if (args.duration === 'unset' || !dashboardDurationError(args.duration)) {
		return;
	}
	await waitFor(() =>
		expect(validation).toHaveTextContent('"spec.duration" must be'),
	);
	await userEvent.hover(validation);
	await screen.findByRole('tooltip', {}, PAGE_LOAD);
};

export const expandPanelSearch = async ({
	canvasElement,
	args,
}: DashboardPlayContext): Promise<void> => {
	if (!hasPanelSearch(args)) {
		return;
	}

	// Both the table and the log list render a search trigger; expand the first.
	const [trigger] = await within(canvasElement).findAllByTestId(
		'panel-header-search-trigger',
		{},
		{ timeout: 15000 },
	);
	await userEvent.click(trigger);
	const input = await screen.findByTestId('panel-header-search-input-field');

	await userEvent.type(input, 'error');
};

export const openDeleteDashboardDialog = async ({
	canvasElement,
	args,
}: DashboardPlayContext): Promise<void> => {
	if (!canDeleteDashboard(args)) {
		return;
	}

	await openActionsMenu(canvasElement);
	// The row stays inert until its authz checks resolve, so one click can
	// land too early; keep clicking until the confirm dialog is up.
	await waitFor(
		async () => {
			const item = screen.queryByTestId('dashboard-action-delete');
			if (item) {
				await userEvent.click(item);
			}
			screen.getByText('This action cannot be undone.');
		},
		{ timeout: 10000 },
	);
};

export const openRenameSectionDialog = async ({
	canvasElement,
	args,
}: DashboardPlayContext): Promise<void> => {
	if (!canEditSections(args)) {
		return;
	}

	await clickSectionAction(canvasElement, 'Rename section');
	await screen.findByRole('dialog', { name: /rename section/i });
};

/** Opens `panelId` in view mode and, given a `tab`, switches its editor to it. */
const openViewPanelModal =
	(panelId: PanelId, tab?: string) =>
	async ({ canvasElement, args }: DashboardPlayContext): Promise<void> => {
		if (!hasPanel(args, panelId)) {
			return;
		}

		await clickPanelAction(canvasElement, panelId, 'View');
		await screen.findByText(/\(View mode\)/);
		if (tab) {
			await userEvent.click(await screen.findByRole('tab', { name: tab }));
			await waitFor(() =>
				expect(screen.getByRole('tab', { name: tab })).toHaveAttribute(
					'aria-selected',
					'true',
				),
			);
		}
	};

export const openRequestRateViewPanel = openViewPanelModal('request-rate');

export const openRecentLogsViewPanel = openViewPanelModal('recent-logs');

export const openClickHouseViewPanel = openViewPanelModal(
	'request-rate',
	'ClickHouse Query',
);

export const openPromQLViewPanel = openViewPanelModal('request-rate', 'PromQL');

export const openAIQueryBuilderViewPanel = openViewPanelModal(
	'request-rate',
	'AI Query Builder',
);
