import { expect, type Locator, type Page } from '@playwright/test';

import { antdDriver } from './antd';
import { apiDriver } from './api';
import {
	driver,
	kit,
	SEEDED_DATA_TIMEOUT,
	seeded,
	type Layer,
	type WorkerLayer,
} from './kit';
import { childSpan, rootSpan, stamp, STATUS } from './spans';
import {
	seedTracesViaSeeder,
	traceDetailsDriver,
	type SeederSpan,
	type TraceDetails,
} from './traces';

/**
 * Trace funnels: the list page, the detail page, the "add span to funnel" modal
 * on trace details, and API seeds.
 *
 * Funnels are org-wide and their names must be unique, so every name carries the
 * worker's stamp. The `funnelSpans` seed removes them by prefix on close.
 */

const FUNNELS_API = '/api/v1/trace-funnels';
const LIST_PATH = '/traces/funnels';
const TIME_RANGE = 'relativeTime=15m';

/** `/api/v1/trace-funnels` is not in `docs/api/openapi.yml`, so these are local. */
export interface FunnelStep {
	step_order: number;
	service_name: string;
	span_name: string;
	latency_pointer?: 'start' | 'end';
	latency_type?: string;
	has_errors: boolean;
	filters?: { op: string; items: unknown[] };
}

export interface Funnel {
	funnel_id: string;
	funnel_name: string;
	steps?: FunnelStep[] | null;
}

export type LatencyPointer = 'Start of span' | 'End of span';

export interface FunnelSeed {
	create(name: string): Promise<Funnel>;
	/** Replace the steps; each entry is a complete step. */
	setSteps(
		id: string,
		steps: { service: string; span: string; latencyPointer?: 'start' | 'end' }[],
	): Promise<void>;
	get(id: string): Promise<Funnel>;
	list(): Promise<Funnel[]>;
	remove(id: string): Promise<void>;
	removeByPrefix(prefix: string): Promise<void>;
}

export interface Funnels {
	seed: FunnelSeed;

	gotoList(): Promise<void>;
	newFunnelButton(): Locator;
	search(text: string): Promise<void>;
	item(name: string): Locator;
	/** Fill the create modal and press Create; resolves with the response status. */
	submitCreate(name: string): Promise<number>;
	/** Create through the modal and land on the detail page; resolves with the id. */
	create(name: string): Promise<string>;
	createModal(): Locator;
	createError(): Locator;
	rename(name: string, next: string): Promise<void>;
	remove(name: string): Promise<void>;
	/** Delete from the detail page header. */
	removeFromDetail(): Promise<void>;
	pathname(): string;

	goto(id: string): Promise<void>;
	title(): Locator;
	actionsTrigger(): Locator;
	step(index: number): Locator;
	setStep(index: number, service: string, span: string): Promise<void>;
	stepSelect(index: number, which: 'service' | 'span'): Locator;
	addStep(): Promise<void>;
	stepsCount(): Locator;
	stepActionsTrigger(index: number): Locator;
	openStepActions(index: number): Promise<void>;
	stepDeleteAction(): Locator;
	deleteStep(index: number): Promise<void>;
	latencyPointer(index: number): Locator;
	setLatencyPointer(index: number, pointer: LatencyPointer): Promise<void>;
	saveButton(): Locator;
	save(): Promise<void>;
	validStatus(): Locator;
	results(): Locator;
	slowTraces(): Locator;
	errorTraces(): Locator;
	slowTraceIdCells(): Locator;
	errorTrace(traceId: string): Locator;
	traceIdsIn(table: Locator): Promise<string[]>;

	/** Trace details, for the add-span-to-funnel flow. */
	traces: TraceDetails;
	addSpanModal: {
		open(spanId: string): Promise<void>;
		dialog(): Locator;
		pickFunnel(id: string): Promise<void>;
		addForNewStep(): Promise<void>;
		save(): Promise<void>;
	};
}

const isFunnelsCall =
	(method: string, path: string | RegExp) =>
	(response: { url(): string; request(): { method(): string } }): boolean => {
		const url = new URL(response.url()).pathname;
		const matches =
			typeof path === 'string'
				? url === `${FUNNELS_API}${path}`
				: path.test(url.replace(FUNNELS_API, ''));
		return matches && response.request().method() === method;
	};

export function funnelSeed(page: Page): FunnelSeed {
	const api = apiDriver(page);
	const seed: FunnelSeed = {
		create: async (name) =>
			(
				await api.post<{ data: Funnel }>(`${FUNNELS_API}/new`, {
					funnel_name: name,
					timestamp: Date.now(),
				})
			).data,

		setSteps: async (id, steps) => {
			await api.put(`${FUNNELS_API}/steps/update`, {
				funnel_id: id,
				timestamp: Date.now(),
				steps: steps.map((step, index) => ({
					step_order: index + 1,
					service_name: step.service,
					span_name: step.span,
					latency_pointer: step.latencyPointer ?? (index === 0 ? 'start' : 'end'),
					has_errors: false,
					filters: { op: 'AND', items: [] },
				})),
			});
		},

		get: async (id) =>
			(await api.get<{ data: Funnel }>(`${FUNNELS_API}/${id}`)).data,

		list: async () =>
			(await api.get<{ data: Funnel[] | null }>(`${FUNNELS_API}/list`)).data ?? [],

		remove: (id) => api.tryDel(`${FUNNELS_API}/${id}`),

		removeByPrefix: async (prefix) => {
			const all = await seed.list();
			await Promise.all(
				all
					.filter((funnel) => funnel.funnel_name.startsWith(prefix))
					.map((funnel) => seed.remove(funnel.funnel_id)),
			);
		},
	};
	return seed;
}

// `addInitScript` re-runs on every navigation, so each funnel's reset is
// registered at most once per page.
const stepResets = new WeakMap<Page, Set<string>>();

export function funnelsDriver(page: Page): Funnels {
	const antd = antdDriver(page);

	/**
	 * Unsaved steps live in `FUNNEL_STEPS_<id>` and are restored over the saved
	 * ones, so the key is cleared before every navigation, reloads included.
	 */
	const resetSteps = async (id: string): Promise<void> => {
		const registered = stepResets.get(page) ?? new Set<string>();
		stepResets.set(page, registered);
		if (registered.has(id)) {
			return;
		}
		registered.add(id);
		await page.addInitScript((key) => {
			localStorage.removeItem(key);
		}, `FUNNEL_STEPS_${id}`);
	};

	const openActions = async (scope: Locator): Promise<void> => {
		await scope.getByTestId('funnel-actions-trigger').click();
	};

	const confirmDelete = async (): Promise<void> => {
		await page.getByTestId('funnel-action-delete').click();
		const deleted = page.waitForResponse(
			isFunnelsCall('DELETE', /^\/[0-9a-f-]{36}$/),
		);
		await page.getByRole('button', { name: 'Delete Funnel' }).click();
		expect((await deleted).ok()).toBe(true);
	};

	const funnels: Funnels = {
		seed: funnelSeed(page),

		gotoList: async () => {
			await page.goto(LIST_PATH);
			await expect(funnels.newFunnelButton()).toBeVisible();
		},

		newFunnelButton: () => page.getByTestId('traces-funnels-new-btn'),

		search: async (text) => {
			await page.getByTestId('traces-funnels-search').fill(text);
		},

		item: (name) =>
			page.locator('[data-testid^="funnel-item-"]').filter({
				has: page.getByText(name, { exact: true }),
			}),

		createModal: () => page.getByTestId('create-funnel-modal'),
		createError: () => page.getByTestId('create-funnel-error'),

		submitCreate: async (name) => {
			await funnels.newFunnelButton().click();
			await page.getByTestId('create-funnel-name-input').fill(name);
			const created = page.waitForResponse(isFunnelsCall('POST', '/new'));
			await page.getByRole('button', { name: 'Create Funnel' }).click();
			return (await created).status();
		},

		create: async (name) => {
			expect(await funnels.submitCreate(name)).toBe(200);
			await expect(page).toHaveURL(/\/traces\/funnels\/[0-9a-f-]{36}/);
			const id = new URL(page.url()).pathname.split('/').pop();
			if (!id) {
				throw new Error(`no funnel id in ${page.url()}`);
			}
			return id;
		},

		rename: async (name, next) => {
			await openActions(funnels.item(name));
			await page.getByTestId('funnel-action-rename').click();
			await page.getByTestId('rename-funnel-name-input').fill(next);
			const renamed = page.waitForResponse(
				isFunnelsCall('PUT', /^\/[0-9a-f-]{36}$/),
			);
			await page.getByRole('button', { name: 'Rename Funnel' }).click();
			expect((await renamed).ok()).toBe(true);
		},

		remove: async (name) => {
			await openActions(funnels.item(name));
			await confirmDelete();
		},

		removeFromDetail: async () => {
			await funnels.actionsTrigger().click();
			await confirmDelete();
		},

		pathname: () => new URL(page.url()).pathname,

		goto: async (id) => {
			await resetSteps(id);
			await page.goto(`${LIST_PATH}/${id}?${TIME_RANGE}`);
			await expect(funnels.title()).toBeVisible();
		},

		title: () => page.getByTestId('funnel-title'),

		actionsTrigger: () => page.getByTestId('funnel-actions-trigger'),

		step: (index) => page.getByTestId(`funnel-step-${index}`),

		stepSelect: (index, which) =>
			page
				.getByTestId(`funnel-step-${which}-select-${index}`)
				.locator('.ant-select'),

		setStep: async (index, service, span) => {
			for (const [which, value] of [
				['service', service],
				['span', span],
			] as const) {
				const select = funnels.stepSelect(index, which);
				// eslint-disable-next-line no-await-in-loop
				await select.click();
				// eslint-disable-next-line no-await-in-loop
				await select.locator('input[role="combobox"]').fill(value);
				// eslint-disable-next-line no-await-in-loop
				const dropdown = await antd.ownDropdown(select);
				// FilterSelect prepends the typed text as an option, so the exact
				// title exists even before the options request returns.
				// eslint-disable-next-line no-await-in-loop
				await dropdown
					.locator(`.ant-select-item-option[title="${value}"]`)
					.first()
					.click();
				// eslint-disable-next-line no-await-in-loop
				await expect(select).toContainText(value);
			}
		},

		addStep: async () => {
			await page.getByTestId('funnel-add-step-btn').click();
		},

		stepsCount: () => page.getByTestId('funnel-steps-count'),

		stepActionsTrigger: (index) =>
			funnels.step(index).getByTestId('funnel-step-actions'),
		openStepActions: async (index) => {
			await funnels.stepActionsTrigger(index).click();
			await expect(funnels.stepDeleteAction()).toBeVisible();
		},

		stepDeleteAction: () => page.getByTestId('funnel-step-action-delete'),

		deleteStep: async (index) => {
			await funnels.openStepActions(index);
			await funnels.stepDeleteAction().click();
			await page.getByRole('button', { name: 'Delete Step' }).click();
		},

		latencyPointer: (index) =>
			page.getByTestId(`funnel-step-latency-pointer-${index}`),

		setLatencyPointer: async (index, pointer) => {
			await funnels.latencyPointer(index).click();
			await page.getByRole('menuitemradio', { name: pointer }).click();
			await expect(funnels.latencyPointer(index)).toContainText(pointer);
		},

		saveButton: () => page.getByTestId('funnel-save-btn'),

		save: async () => {
			// The PUT body is the 200ms-debounced steps; the draft key is written from the same value.
			await expect
				.poll(() =>
					page.evaluate(() => {
						const key = Object.keys(localStorage).find((name) =>
							name.startsWith('FUNNEL_STEPS_'),
						);
						const draft = key ? JSON.parse(localStorage.getItem(key) ?? '[]') : [];
						return (
							draft.length > 0 &&
							draft.every(
								(step: { service_name: string; span_name: string }) =>
									step.service_name && step.span_name,
							)
						);
					}),
				)
				.toBe(true);
			const saved = page.waitForResponse(isFunnelsCall('PUT', '/steps/update'));
			await funnels.saveButton().click();
			expect((await saved).ok()).toBe(true);
		},

		validStatus: () => page.getByTestId('funnel-valid-traces-status'),
		results: () => page.getByTestId('funnel-results'),
		slowTraces: () => page.getByTestId('funnel-slowest-traces'),
		errorTraces: () => page.getByTestId('funnel-error-traces'),
		slowTraceIdCells: () =>
			page.getByTestId('funnel-slowest-traces').locator('a.trace-id-cell'),
		errorTrace: (traceId) =>
			page.getByTestId('funnel-error-traces').getByText(traceId, { exact: true }),

		traceIdsIn: async (table) =>
			(await table.locator('a.trace-id-cell').allInnerTexts()).map((text) =>
				text.trim(),
			),

		traces: traceDetailsDriver(page),

		addSpanModal: {
			dialog: () => page.getByRole('dialog', { name: 'Add span to funnel' }),

			open: async (spanId) => {
				const row = page.getByTestId(`cell-0-${spanId}`);
				// The row's action buttons are only shown on hover.
				await row.hover();
				await row.getByTestId('span-add-to-funnel-btn').click();
				await expect(funnels.addSpanModal.dialog()).toBeVisible();
			},

			pickFunnel: async (id) => {
				const dialog = funnels.addSpanModal.dialog();
				await dialog.getByTestId(`funnel-item-${id}`).click();
				await expect(dialog.getByTestId('funnel-step-0')).toBeVisible({
					timeout: SEEDED_DATA_TIMEOUT,
				});
			},

			addForNewStep: async () => {
				await funnels.addSpanModal
					.dialog()
					.getByTestId('funnel-add-step-btn')
					.click();
			},

			save: async () => {
				const saved = page.waitForResponse(isFunnelsCall('PUT', '/steps/update'));
				await page.getByTestId('add-span-save-btn').click();
				expect((await saved).ok()).toBe(true);
			},
		},
	};

	return funnels;
}

// ─── Seed ────────────────────────────────────────────────────────────────────

export interface FunnelSpans {
	/** Prefix for every funnel name in this worker; removed on close. */
	stamp: string;
	services: { a: string; b: string };
	spans: { a: string; b: string };
	/** Traces that complete both steps, the error trace included. */
	traceIds: string[];
	errorTraceId: string;
	/** Root (step 1) span id per trace in `traceIds`. */
	rootSpanIds: Record<string, string>;
	/** A trace with only the step 1 span. */
	dropOffTraceId: string;
}

const STEP_A = 'GET /checkout';
const STEP_B = 'POST /charge';

export const withFunnelSpans: WorkerLayer<{ funnelSpans: FunnelSpans }> =
	seeded(
		'funnelSpans',
		async ({ page, workerIndex }) => {
			const prefix = stamp('fn', workerIndex);
			const services = { a: `${prefix}-web`, b: `${prefix}-pay` };
			const spans: SeederSpan[] = [];
			const rootSpanIds: Record<string, string> = {};
			const traceIds: string[] = [];

			for (let i = 0; i < 4; i += 1) {
				const root = rootSpan({
					service: services.a,
					name: STEP_A,
					agoMs: 60_000 - i * 5_000,
				});
				const child = childSpan(root, {
					service: services.b,
					name: STEP_B,
					offsetMs: 50,
					status: i === 3 ? STATUS.error : STATUS.ok,
				});
				spans.push(root, child);
				traceIds.push(root.trace_id);
				rootSpanIds[root.trace_id] = root.span_id;
			}
			const dropOff = rootSpan({
				service: services.a,
				name: STEP_A,
				agoMs: 20_000,
			});
			spans.push(dropOff);

			await seedTracesViaSeeder(page.request, spans);

			return {
				stamp: prefix,
				services,
				spans: { a: STEP_A, b: STEP_B },
				traceIds,
				errorTraceId: traceIds[3],
				rootSpanIds,
				dropOffTraceId: dropOff.trace_id,
			};
		},
		async ({ page, value }) => {
			await funnelSeed(page).removeByPrefix(value.stamp);
		},
	);

export const withFunnels: Layer<{ funnels: Funnels }> = driver(
	'funnels',
	({ page }) => funnelsDriver(page),
);

/** The trace funnels `test`. */
export const test = withFunnelSpans(withFunnels(kit));
export {
	allowFor,
	expect,
	SEEDED_DATA_TIMEOUT,
	SEEDED_TEST_BUDGET,
} from './kit';
