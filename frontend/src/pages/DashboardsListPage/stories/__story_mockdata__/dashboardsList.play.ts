/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, within } from 'storybook/test';

import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	clickRowAction,
	dashboardsListMocks,
	openLegacyDialog,
	openRowActions,
	pickRowAction,
	requestTemplate,
	retryMigration,
	TOAST_TIMEOUT,
	uploadDashboardJson,
} from '../DashboardsListPage.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: PageStoryArgs<typeof dashboardsListMocks>;
}

const IMPORTED_SPEC = { layouts: [], panels: {}, variables: [] };

export const openCreatedByFilter = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const filter = await within(canvasElement).findByTestId(
		'dashboards-filter-created-by',
		{},
		{ timeout: TOAST_TIMEOUT },
	);

	await userEvent.click(filter.querySelector('.ant-select-selector') ?? filter);
	await userEvent.click(await screen.findByText('Ada (ada@signoz.io)'));
	await screen.findByRole('checkbox', { checked: true });
};

export const openTemplateTab = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const canvas = within(canvasElement);

	await userEvent.click(
		await canvas.findByTestId('new-dashboard-cta', {}, { timeout: 10000 }),
	);

	await expect(
		await screen.findByRole('dialog', {}, { timeout: 10000 }),
	).toHaveTextContent('New dashboard');
	await userEvent.click(await screen.findByText('From a template'));
	await screen.findByText('Dashboard templates');
};

export const importInvalidJson = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const canvas = within(canvasElement);

	await userEvent.click(
		await canvas.findByTestId('new-dashboard-cta', {}, { timeout: 10000 }),
	);
	await userEvent.click(await screen.findByText('Import JSON'));
	await userEvent.click(await screen.findByTestId('import-json-submit'));
	await screen.findByText(/error loading json/i);
	// The error modal and the toast under it carry the same message.
	await screen.findAllByText('Unexpected end of JSON input');
};

export const openFirstRowActions = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openRowActions(canvasElement, 0);
};

export const openRenameDialog = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openRowActions(canvasElement, 1);
	await pickRowAction('Rename');
	await screen.findByRole('dialog', { name: 'Rename dashboard' });
};

export const openEditTagsDialog = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openRowActions(canvasElement, 1);
	await pickRowAction(/^(Edit|Add) Tags$/);
	await screen.findByRole('dialog', { name: /^(Edit|Add) tags$/ });
};

export const openSaveViewPopover = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByRole(
			'button',
			{ name: 'Save current filters as a view' },
			{ timeout: 10000 },
		),
	);
	await screen.findByText('Save as view');
};

export const renameDashboard = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await openRowActions(canvasElement, 1);
	await pickRowAction('Rename');
	const input = await screen.findByTestId('rename-dashboard-input');

	await userEvent.clear(input);
	await userEvent.type(input, 'API latency overview');
	await userEvent.click(await screen.findByTestId('rename-dashboard-submit'));
	if (args.rowWrite === 'success') {
		await screen.findByText('Dashboard renamed', {}, { timeout: TOAST_TIMEOUT });
	}
};

export const updateTags = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await openRowActions(canvasElement, 1);
	await pickRowAction(/^(Edit|Add) Tags$/);
	const input = await screen.findByPlaceholderText('key:value (press Enter)');

	await userEvent.type(input, 'owner:sre{Enter}');
	await userEvent.click(await screen.findByTestId('edit-tags-submit'));
	if (args.rowWrite === 'success') {
		await screen.findByText('Tags updated', {}, { timeout: TOAST_TIMEOUT });
	}
};

export const duplicateDashboard = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await openRowActions(canvasElement, 1);
	await clickRowAction('dashboard-action-duplicate');
	if (args.rowWrite === 'success') {
		await screen.findByText(
			'Duplicated "API latency and errors"',
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	}
};

export const lockDashboard = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await openRowActions(canvasElement, 1);
	await clickRowAction('dashboard-action-lock');
	if (args.rowWrite === 'success') {
		await screen.findByText('Dashboard locked', {}, { timeout: TOAST_TIMEOUT });
	}
};

export const unlockDashboard = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await openRowActions(canvasElement, 0);
	await clickRowAction('dashboard-action-lock');
	if (args.rowWrite === 'success') {
		await screen.findByText('Dashboard unlocked', {}, { timeout: TOAST_TIMEOUT });
	}
};

export const deleteDashboard = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await openRowActions(canvasElement, 1);
	await clickRowAction('dashboard-action-delete');
	const dialog = await screen.findByRole('dialog');

	await userEvent.click(
		await within(dialog).findByRole('button', { name: 'Delete' }),
	);
	if (args.rowWrite === 'success') {
		await screen.findByText(
			'Dashboard deleted successfully',
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	}
};

export const pinPastLimit = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(
			'dashboard-pin-3',
			{},
			{ timeout: TOAST_TIMEOUT },
		),
	);
	await screen.findByText(
		/You can pin up to 10 dashboards/,
		{},
		{ timeout: TOAST_TIMEOUT },
	);
};

export const pinFails = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(
			'dashboard-pin-3',
			{},
			{ timeout: TOAST_TIMEOUT },
		),
	);
	await screen.findByText(
		'Failed to pin dashboard.',
		{},
		{ timeout: TOAST_TIMEOUT },
	);
};

export const unpinFails = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(
			'dashboard-pin-0',
			{},
			{ timeout: TOAST_TIMEOUT },
		),
	);
	await screen.findByText(
		'Failed to unpin dashboard.',
		{},
		{ timeout: TOAST_TIMEOUT },
	);
};

export const copyLegacyDashboardId = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openLegacyDialog(canvasElement);
	await userEvent.click(await screen.findByTestId('legacy-dashboard-copy-id'));
	await screen.findByText('Dashboard ID copied', {}, { timeout: TOAST_TIMEOUT });
};

export const migrateDashboard = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await retryMigration(canvasElement);
	if (args.migrationWrite === 'success') {
		await screen.findByText(
			'Dashboard migrated to the new experience',
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	}
};

export const migrationFails = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await retryMigration(canvasElement);
	await screen.findByText(
		'Something went wrong',
		{},
		{ timeout: TOAST_TIMEOUT },
	);
};

export const createDashboardFails = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(
			'new-dashboard-cta',
			{},
			{ timeout: TOAST_TIMEOUT },
		),
	);
	await userEvent.click(await screen.findByTestId('create-dashboard-submit'));
	await screen.findAllByText(
		/Something went wrong/,
		{},
		{ timeout: TOAST_TIMEOUT },
	);
};

export const importInvalidImage = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(
			'new-dashboard-cta',
			{},
			{ timeout: TOAST_TIMEOUT },
		),
	);
	await uploadDashboardJson({
		schemaVersion: 'v6',
		image: 'https://example.com/logo.png',
		spec: { display: { name: 'Imported' }, ...IMPORTED_SPEC },
	});
	await screen.findByText(
		/Dashboard "image" must be/,
		{},
		{ timeout: TOAST_TIMEOUT },
	);
};

export const importCreateFails = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(
			'new-dashboard-cta',
			{},
			{ timeout: TOAST_TIMEOUT },
		),
	);
	await uploadDashboardJson({
		schemaVersion: 'v6',
		spec: { display: { name: 'Imported' }, ...IMPORTED_SPEC },
	});
	await screen.findAllByText(
		/Something went wrong/,
		{},
		{ timeout: TOAST_TIMEOUT },
	);
};

export const submitTemplateRequest = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await requestTemplate(canvasElement);
	await screen.findByText(
		'Dashboard request submitted',
		{},
		{ timeout: TOAST_TIMEOUT },
	);
};

export const templateRequestFails = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await requestTemplate(canvasElement);
	await screen.findByText('Event rejected', {}, { timeout: TOAST_TIMEOUT });
};

export const templateRequestRejected = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await requestTemplate(canvasElement);
	await screen.findByText(
		'Something went wrong',
		{},
		{ timeout: TOAST_TIMEOUT },
	);
};

export const saveViewFails = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByRole(
			'button',
			{ name: 'Save current filters as a view' },
			{ timeout: TOAST_TIMEOUT },
		),
	);
	await userEvent.type(await screen.findByTestId('save-view-name'), 'On-call');
	await userEvent.click(await screen.findByTestId('save-view-confirm'));
	await screen.findByText(
		'Failed to save view.',
		{},
		{ timeout: TOAST_TIMEOUT },
	);
};

export const renameViewFails = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const [rename] = await within(canvasElement).findAllByRole(
		'button',
		{ name: 'Rename view' },
		{ timeout: TOAST_TIMEOUT },
	);

	// The actions only take pointer events while the row is hovered by CSS.
	await userEvent.click(rename, { pointerEventsCheck: 0 });
	const input = await screen.findByTestId('rename-view-name');

	await userEvent.clear(input);
	await userEvent.type(input, 'Renamed view');
	await userEvent.click(await screen.findByTestId('rename-view-confirm'));
	await screen.findByText(
		'Failed to update view.',
		{},
		{ timeout: TOAST_TIMEOUT },
	);
};

export const deleteViewFails = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const [remove] = await within(canvasElement).findAllByRole(
		'button',
		{ name: 'Delete view' },
		{ timeout: TOAST_TIMEOUT },
	);

	await userEvent.click(remove, { pointerEventsCheck: 0 });
	const dialog = await screen.findByRole('dialog');

	await userEvent.click(
		await within(dialog).findByRole('button', { name: 'Delete' }),
	);
	await screen.findByText(
		'Failed to delete view.',
		{},
		{ timeout: TOAST_TIMEOUT },
	);
};
