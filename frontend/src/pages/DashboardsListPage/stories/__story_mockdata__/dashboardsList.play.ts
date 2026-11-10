/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, within } from 'storybook/test';

import {
	canCreate,
	canDelete,
	canDuplicate,
	canList,
	canUpdate,
	clickRowAction,
	type DashboardsListArgs,
	isCloudTenant,
	listedDashboards,
	openLegacyDialog,
	openRowActions,
	pickRowAction,
	requestTemplate,
	retryMigration,
	showsWorkspaceEmpty,
	TOAST_TIMEOUT,
	uploadDashboardJson,
} from '../DashboardsListPage.stories.mocks';
import type { TemplateRequest } from './dashboardsList';

interface PlayContext {
	canvasElement: HTMLElement;
	args: DashboardsListArgs;
}

const IMPORTED_SPEC = { layouts: [], panels: {}, variables: [] };

const TEMPLATE_REQUEST_TOASTS = {
	success: 'Dashboard request submitted',
	error: 'Event rejected',
	rejected: 'Something went wrong',
} satisfies Record<TemplateRequest, string>;

const openNewDashboard = async (canvasElement: HTMLElement): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(
			'new-dashboard-cta',
			{},
			{ timeout: TOAST_TIMEOUT },
		),
	);
};

const canEditRow = (args: DashboardsListArgs, index: number): boolean => {
	const row = listedDashboards(args)[index];

	return !!row && !row.legacy && !row.locked && canUpdate(args, row);
};

export const openCreatedByFilter = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (
		!canList(args) ||
		args.dataState !== 'loaded' ||
		showsWorkspaceEmpty(args)
	) {
		return;
	}

	const filter = await within(canvasElement).findByTestId(
		'dashboards-filter-created-by',
		{},
		{ timeout: TOAST_TIMEOUT },
	);

	await userEvent.click(filter.querySelector('.ant-select-selector') ?? filter);
	await userEvent.click(await screen.findByText('Ada (ada@signoz.io)'));
	await screen.findAllByRole('checkbox', { checked: true });
};

export const openTemplateTab = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!canCreate(args)) {
		return;
	}

	await openNewDashboard(canvasElement);
	await expect(
		await screen.findByRole('dialog', {}, { timeout: 10000 }),
	).toHaveTextContent('New dashboard');
	await userEvent.click(await screen.findByText('From a template'));
	await screen.findByText('Dashboard templates');
};

export const importInvalidJson = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!canCreate(args)) {
		return;
	}

	await openNewDashboard(canvasElement);
	await userEvent.click(await screen.findByText('Import JSON'));
	await userEvent.click(await screen.findByTestId('import-json-submit'));
	await screen.findByText(/error loading json/i);
	// The error modal and the toast under it carry the same message.
	await screen.findAllByText('Unexpected end of JSON input');
};

export const openFirstRowActions = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (listedDashboards(args).length === 0) {
		return;
	}

	await openRowActions(canvasElement, 0);
};

export const openRenameDialog = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!canEditRow(args, 1)) {
		return;
	}

	await openRowActions(canvasElement, 1);
	await pickRowAction('Rename');
	await screen.findByRole('dialog', { name: 'Rename dashboard' });
};

export const openEditTagsDialog = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!canEditRow(args, 1)) {
		return;
	}

	await openRowActions(canvasElement, 1);
	await pickRowAction(/^(Edit|Add) Tags$/);
	await screen.findByRole('dialog', { name: /^(Edit|Add) tags$/ });
};

export const openSaveViewDialog = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!canList(args)) {
		return;
	}

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
	if (!canEditRow(args, 1)) {
		return;
	}

	await openRowActions(canvasElement, 1);
	await pickRowAction('Rename');
	const input = await screen.findByTestId('rename-dashboard-input-field');

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
	if (!canEditRow(args, 1)) {
		return;
	}

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
	const row = listedDashboards(args)[1];
	if (!row || row.legacy || !canDuplicate(args, row)) {
		return;
	}

	await openRowActions(canvasElement, 1);
	await clickRowAction('dashboard-action-duplicate');
	if (args.rowWrite === 'success') {
		await screen.findByText(
			`Duplicated "${row.name}"`,
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	}
};

const toggleLockAt = async (
	canvasElement: HTMLElement,
	args: DashboardsListArgs,
	index: number,
): Promise<void> => {
	const row = listedDashboards(args)[index];
	if (!row || row.legacy || !canUpdate(args, row)) {
		return;
	}

	await openRowActions(canvasElement, index);
	await clickRowAction('dashboard-action-lock');
	if (args.rowWrite === 'success') {
		await screen.findByText(
			row.locked ? 'Dashboard unlocked' : 'Dashboard locked',
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	}
};

export const lockDashboard = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => toggleLockAt(canvasElement, args, 1);

export const unlockDashboard = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => toggleLockAt(canvasElement, args, 0);

export const deleteDashboard = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	const row = listedDashboards(args)[1];
	if (!row || !canDelete(args, row)) {
		return;
	}

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

export const pinDashboard = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	const index = listedDashboards(args).findIndex((row) => !row.pinned);
	if (index < 0) {
		return;
	}

	await userEvent.click(
		await within(canvasElement).findByTestId(
			`dashboard-pin-${index}`,
			{},
			{ timeout: TOAST_TIMEOUT },
		),
	);
	if (args.pinWrite === 'limit') {
		await screen.findByText(
			/You can pin up to 10 dashboards/,
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	}
	if (args.pinWrite === 'error') {
		await screen.findByText(
			'Failed to pin dashboard.',
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	}
};

export const unpinDashboard = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	const index = listedDashboards(args).findIndex((row) => row.pinned);
	if (index < 0) {
		return;
	}

	await userEvent.click(
		await within(canvasElement).findByTestId(
			`dashboard-pin-${index}`,
			{},
			{ timeout: TOAST_TIMEOUT },
		),
	);
	if (args.pinWrite === 'error') {
		await screen.findByText(
			'Failed to unpin dashboard.',
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	}
};

export const copyLegacyDashboardId = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	const index = listedDashboards(args).findIndex((row) => row.legacy);
	if (index < 0) {
		return;
	}

	await openLegacyDialog(canvasElement, index);
	await userEvent.click(await screen.findByTestId('legacy-dashboard-copy-id'));
	await screen.findByText('Dashboard ID copied', {}, { timeout: TOAST_TIMEOUT });
};

export const migrateDashboard = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	const rows = listedDashboards(args);
	const index = rows.findIndex((row) => row.legacy);
	if (index < 0 || !canUpdate(args, rows[index])) {
		return;
	}

	await retryMigration(canvasElement, index);
	if (args.migrationWrite === 'success') {
		await screen.findByText(
			'Dashboard migrated to the new experience',
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	}
	if (args.migrationWrite === 'error') {
		await screen.findByText(
			'Something went wrong',
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	}
};

export const createDashboard = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!canCreate(args)) {
		return;
	}

	await openNewDashboard(canvasElement);
	await userEvent.click(await screen.findByTestId('create-dashboard-submit'));
	if (args.createWrite === 'error') {
		await screen.findAllByText(
			/Something went wrong/,
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	}
};

export const importInvalidImage = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!canCreate(args)) {
		return;
	}

	await openNewDashboard(canvasElement);
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

export const importDashboard = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!canCreate(args)) {
		return;
	}

	await openNewDashboard(canvasElement);
	await uploadDashboardJson({
		schemaVersion: 'v6',
		spec: { display: { name: 'Imported' }, ...IMPORTED_SPEC },
	});
	if (args.createWrite === 'error') {
		await screen.findAllByText(
			/Something went wrong/,
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	}
};

export const submitTemplateRequest = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!canCreate(args) || !isCloudTenant(args)) {
		return;
	}

	await requestTemplate(canvasElement);
	await screen.findByText(
		TEMPLATE_REQUEST_TOASTS[args.templateRequest],
		{},
		{ timeout: TOAST_TIMEOUT },
	);
};

export const saveView = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!canList(args)) {
		return;
	}

	await userEvent.click(
		await within(canvasElement).findByRole(
			'button',
			{ name: 'Save current filters as a view' },
			{ timeout: TOAST_TIMEOUT },
		),
	);
	await userEvent.type(
		await screen.findByTestId('save-view-name-field'),
		'On-call',
	);
	await userEvent.click(await screen.findByTestId('save-view-confirm'));
	if (args.viewWrite === 'error') {
		await screen.findByText(
			'Failed to save view.',
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	}
};

const listsSavedViews = (args: DashboardsListArgs): boolean =>
	canList(args) && args.dataState === 'loaded' && args.savedViews > 0;

export const renameView = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsSavedViews(args)) {
		return;
	}

	const [rename] = await within(canvasElement).findAllByRole(
		'button',
		{ name: 'Rename view' },
		{ timeout: TOAST_TIMEOUT },
	);

	// The actions only take pointer events while the row is hovered by CSS.
	await userEvent.click(rename, { pointerEventsCheck: 0 });
	const input = await screen.findByTestId('rename-view-name-field');

	await userEvent.clear(input);
	await userEvent.type(input, 'Renamed view');
	await userEvent.click(await screen.findByTestId('rename-view-confirm'));
	if (args.viewWrite === 'error') {
		await screen.findByText(
			'Failed to update view.',
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	}
};

export const deleteView = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsSavedViews(args)) {
		return;
	}

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
	if (args.viewWrite === 'error') {
		await screen.findByText(
			'Failed to delete view.',
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	}
};
