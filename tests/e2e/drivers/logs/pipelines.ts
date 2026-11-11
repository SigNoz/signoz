import { expect, type Locator, type Page } from '@playwright/test';

import { antdDriver } from '../antd';
import { apiDriver } from '../api';
import { allowFor, SEEDED_DATA_TIMEOUT, SEEDED_TEST_BUDGET } from '../kit';

/**
 * Logs pipelines: API seeds and the `/logs/pipelines` page.
 *
 * Pipelines are one org-wide list and every save replaces it, so exactly one
 * spec touches them, serially, and resets the list after each test.
 */

const PIPELINES_PATH = '/logs/pipelines';
const PIPELINES_API = '/api/v1/logs/pipelines';
/** `pipelines.alias` is varchar(20); a longer one fails the insert with a 500. */
const ALIAS_MAX = 20;

/** `/api/v1/logs/pipelines` is not in `docs/api/openapi.yml`, so these are local. */
export interface AddProcessor {
	type: 'add';
	id: string;
	orderId: number;
	enabled: boolean;
	name: string;
	field: string;
	value: string;
}

export interface PipelineFilterItem {
	key: { key: string; dataType: string; type: string };
	op: string;
	value: string;
}

export interface PipelineInput {
	id?: string;
	orderId: number;
	name: string;
	alias: string;
	description?: string;
	enabled: boolean;
	filter: { op: 'AND'; items: PipelineFilterItem[] };
	config: AddProcessor[];
}

interface PipelinesResponse {
	data: { pipelines: PipelineInput[] | null; version: number };
}

/** A pipeline over one `service.name`, with a single add processor. */
export function servicePipeline(
	name: string,
	service: string,
	orderId = 1,
): PipelineInput {
	return {
		orderId,
		name,
		alias: name.replace(/\s/g, '').slice(0, ALIAS_MAX),
		description: '',
		enabled: true,
		filter: {
			op: 'AND',
			items: [
				{
					key: { key: 'service.name', dataType: 'string', type: 'resource' },
					op: '=',
					value: service,
				},
			],
		},
		config: [
			{
				type: 'add',
				id: `${name}-add`,
				orderId: 1,
				enabled: true,
				name: 'tag',
				field: 'attributes.e2e_pipeline',
				value: 'yes',
			},
		],
	};
}

export interface ProcessorForm {
	/** Label in the processor type select, e.g. `Add`. */
	type: string;
	name: string;
	field: string;
	value: string;
}

export interface Pipelines {
	seed(list: PipelineInput[]): Promise<void>;
	reset(): Promise<void>;
	latest(): Promise<PipelineInput[]>;

	goto(): Promise<void>;
	emptyState(): Locator;
	newPipelineButton(): Locator;
	editModeButton(): Locator;
	row(name: string): Locator;
	enterEditMode(): Promise<void>;
	/** Create a pipeline and its first processor through the forms, then save. */
	createThroughUi(p: {
		name: string;
		filter: string;
		processor: ProcessorForm;
	}): Promise<void>;
	expand(name: string): Promise<void>;
	rename(from: string, to: string): Promise<void>;
	remove(name: string): Promise<void>;
	save(): Promise<void>;
	openChangeHistory(): Promise<void>;
	changeHistoryRows(): Locator;
	openPreview(name: string): Promise<void>;
	/**
	 * Open the preview until its sample list shows `text`. The sample query runs
	 * once per open, so a row still being ingested needs a reopen.
	 */
	openPreviewUntil(name: string, text: string): Promise<void>;
	closePreview(): Promise<void>;
	previewModal(): Locator;
	previewSamples(): Locator;
	simulate(): Promise<void>;
	previewOutput(): Locator;
	/** Expand the first simulated log into its detail drawer. */
	expandFirstOutput(): Promise<void>;
	outputDetail(): Locator;
}

export function pipelinesDriver(page: Page): Pipelines {
	const api = apiDriver(page);
	const antd = antdDriver(page);

	const dialog = (name: string | RegExp): Locator =>
		page.getByRole('dialog', { name });

	const pipelines: Pipelines = {
		seed: async (list) => {
			await api.post(PIPELINES_API, { pipelines: list });
		},

		reset: async () => {
			await api.post(PIPELINES_API, { pipelines: [] });
		},

		latest: async () =>
			(await api.get<PipelinesResponse>(`${PIPELINES_API}/latest`)).data
				.pipelines ?? [],

		goto: async () => {
			await page.goto(PIPELINES_PATH);
			await expect(
				pipelines.newPipelineButton().or(pipelines.editModeButton()),
			).toBeVisible();
		},

		emptyState: () => page.getByTestId('pipelines-empty-state'),
		newPipelineButton: () => page.getByRole('button', { name: 'New Pipeline' }),
		editModeButton: () => page.getByRole('button', { name: 'Enter Edit Mode' }),

		row: (name) =>
			page
				.locator('tr[data-row-key]')
				.filter({ has: page.getByText(name, { exact: true }) }),

		enterEditMode: async () => {
			await pipelines.editModeButton().click();
			await expect(pipelines.editModeButton()).toBeDisabled();
		},

		createThroughUi: async ({ name, filter, processor }) => {
			if (await pipelines.newPipelineButton().isVisible()) {
				await pipelines.newPipelineButton().click();
			} else {
				await pipelines.enterEditMode();
				await page.getByRole('button', { name: 'Add a New Pipeline' }).click();
			}

			const form = dialog('Create New Pipeline');
			await expect(form).toBeVisible();
			const nameInput = form.getByPlaceholder('Name', { exact: true });
			await nameInput.fill(name);

			// The filter box commits a typed `key op value` into a chip on blur.
			const filterBox = form.getByTestId('qb-search-select');
			await filterBox.locator('input[role="combobox"]').click();
			await page.keyboard.type(filter);
			await nameInput.click();
			await expect(filterBox).toContainText(filter);

			await form.getByRole('button', { name: 'Create', exact: true }).click();
			await expect(form).toBeHidden();

			await pipelines.expand(name);
			await page.getByRole('button', { name: 'Add Processor' }).click();

			const processorForm = dialog('Create New Processor');
			await expect(processorForm).toBeVisible();
			const typeSelect = processorForm.getByTestId('processor-type-select');
			await typeSelect.click();
			const dropdown = await antd.ownDropdown(typeSelect);
			await dropdown
				.locator('.ant-select-item-option')
				.filter({ has: page.getByText(processor.type, { exact: true }) })
				.click();
			await processorForm
				.getByPlaceholder('Name', { exact: true })
				.fill(processor.name);
			await processorForm
				.getByPlaceholder('Field', { exact: true })
				.fill(processor.field);
			await processorForm
				.getByPlaceholder('Value', { exact: true })
				.fill(processor.value);
			await processorForm
				.getByRole('button', { name: 'Create', exact: true })
				.click();
			await expect(processorForm).toBeHidden();

			await pipelines.save();
		},

		expand: async (name) => {
			await pipelines.row(name).getByTestId('pipeline-row-expand').click();
		},

		rename: async (from, to) => {
			await pipelines.enterEditMode();
			await pipelines.row(from).getByTestId('pipeline-edit-action').click();
			const form = dialog(new RegExp(`^Edit Pipeline : ${from}`));
			await expect(form).toBeVisible();
			await form.getByPlaceholder('Name', { exact: true }).fill(to);
			await form.getByRole('button', { name: 'Update', exact: true }).click();
			await expect(form).toBeHidden();
			await pipelines.save();
		},

		remove: async (name) => {
			await pipelines.enterEditMode();
			await pipelines.row(name).getByTestId('pipeline-delete-action').click();
			const confirm = page
				.getByRole('dialog')
				.filter({ hasText: 'Do you want to delete pipeline' });
			await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
			await expect(confirm).toBeHidden();
			await pipelines.save();
		},

		save: async () => {
			const saved = page.waitForResponse(
				(response) =>
					response.url().endsWith(PIPELINES_API) &&
					response.request().method() === 'POST',
			);
			const button = page.getByRole('button', { name: 'Save Configuration' });
			await button.click();
			expect((await saved).ok()).toBe(true);
			await expect(button).toBeHidden();
		},

		openChangeHistory: async () => {
			await page.getByRole('tab', { name: 'Change History' }).click();
		},

		changeHistoryRows: () =>
			page
				.getByRole('tabpanel', { name: 'Change History' })
				.locator('tbody tr.ant-table-row'),

		openPreview: async (name) => {
			await pipelines.row(name).getByTestId('pipeline-preview-action').click();
			await expect(pipelines.previewModal()).toBeVisible();
		},

		openPreviewUntil: async (name, text) => {
			allowFor(SEEDED_TEST_BUDGET);
			await expect(async () => {
				if (await pipelines.previewModal().isVisible()) {
					await pipelines.closePreview();
				}
				await pipelines.openPreview(name);
				await expect(
					pipelines.previewSamples().filter({ hasText: text }).first(),
				).toBeVisible({ timeout: 10_000 });
			}).toPass({ timeout: SEEDED_DATA_TIMEOUT * 2, intervals: [1_000] });
		},

		closePreview: async () => {
			await page.keyboard.press('Escape');
			await expect(pipelines.previewModal()).toBeHidden();
		},

		previewModal: () =>
			page.getByRole('dialog').filter({
				hasText: 'Logs processing preview for',
			}),

		previewSamples: () =>
			pipelines
				.previewModal()
				.getByTestId('pipeline-preview-samples')
				.getByTestId('pipeline-preview-log'),

		simulate: async () => {
			await pipelines
				.previewModal()
				.getByRole('button', { name: 'Simulate Processing' })
				.click();
		},

		previewOutput: () =>
			pipelines
				.previewModal()
				.getByTestId('pipeline-preview-output')
				.getByTestId('pipeline-preview-log'),

		expandFirstOutput: async () => {
			await pipelines.previewOutput().first().getByRole('button').click();
			await expect(pipelines.outputDetail()).toBeVisible();
		},

		outputDetail: () => page.getByTestId('log-detail-drawer'),
	};

	return pipelines;
}
