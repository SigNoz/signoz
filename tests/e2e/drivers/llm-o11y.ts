import { expect, type Locator, type Page } from '@playwright/test';

import { apiDriver } from './api';
import { quickFiltersDriver } from './explorers';
import {
	allowFor,
	driver,
	kit,
	SEEDED_DATA_TIMEOUT,
	SEEDED_TEST_BUDGET,
	type Layer,
} from './kit';
import { randomSpanId, randomTraceId, seedTracesViaSeeder } from './traces';

/** AI observability: the LLM traces explorer, model pricing and attribute mapping. */

export const LLM_EXPLORER_PATH = '/ai-observability/explorer';

export const LLM_PRICING_PATH = '/ai-observability/configuration';
export const LLM_PRICING_PAGE_TESTID = 'llm-observability-model-pricing-page';
export const ATTRIBUTE_MAPPING_PATH = '/ai-observability/attribute-mapping';
export const ATTRIBUTE_MAPPING_PAGE_TESTID =
	'llm-observability-attribute-mapping-page';

/** A seeded two-span trace whose child is an LLM call. */
export interface LlmTraceSeed {
	traceId: string;
	rootSpanId: string;
	rootName: string;
}

export interface AttributeMapping {
	addGroup(): Locator;
	groupDrawer(): Locator;
	groupName(): Locator;
	addGroupAttribute(): Locator;
	groupAttribute(index: number): Locator;
	saveGroup(): Locator;
	/** The expand header of the group named `name`; its testid carries a local id. */
	groupHeader(name: string): Locator;
	/** The add-mapper button; its testid carries the group's local id. */
	addMapper(): Locator;
	mapperDrawer(): Locator;
	mapperTarget(): Locator;
	mapperSource(index: number): Locator;
	saveMapper(): Locator;
	unsavedChanges(): Locator;
	tab(name: string): Locator;
	testTab(): Locator;
	runTest(): Locator;
	testError(): Locator;
	testResults(): Locator;
	saveChanges(): Locator;
}

export interface ModelPricing {
	addModelCost(): Locator;
	modelIdInput(): Locator;
	patternInput(): Locator;
	addPattern(): Locator;
	inputCost(): Locator;
	outputCost(): Locator;
	save(): Locator;
	table(): Locator;
	/** The name cell of the rule for `modelName`; its testid carries the rule id. */
	modelName(modelName: string): Locator;
}

export interface LlmO11y {
	/**
	 * Seed a trace the AI explorer lists: a root span plus one child carrying
	 * `gen_ai.request.model`, one of the keys that gate a trace into it.
	 */
	seedLlmTrace(): Promise<LlmTraceSeed>;
	gotoExplorer(): Promise<void>;
	traceRow(traceId: string): Locator;
	/** Re-run the query until the seeded row lands; the page fetches only once. */
	waitForTraceRow(traceId: string): Promise<void>;
	openTraceRow(seed: LlmTraceSeed): Promise<void>;
	/** The trace details waterfall row for `spanId`. */
	waterfallRow(spanId: string): Locator;
	openQuickFilterSettings(): Promise<void>;
	quickFilterSettings(): Locator;
	gotoPricing(): Promise<void>;
	gotoAttributeMapping(): Promise<void>;
	mapping: AttributeMapping;
	pricing: ModelPricing;
	toast(text: string): Locator;
	/** Best-effort teardown: delete every pricing rule with one of these models. */
	deletePricingRules(modelNames: string[]): Promise<void>;
	/** Best-effort teardown: delete every span-mapper group with one of these names. */
	deleteSpanMapperGroups(names: string[]): Promise<void>;
}

export function llmO11yDriver(page: Page): LlmO11y {
	const api = apiDriver(page);

	const deleteAll = async (
		path: string,
		listPath: string,
		matches: (item: Record<string, string>) => boolean,
	): Promise<void> => {
		const body = await api
			.get<{ data?: { items?: Record<string, string>[] | null } }>(listPath)
			.catch(() => ({ data: { items: [] } }));
		await Promise.all(
			(body.data?.items ?? [])
				.filter(matches)
				.map((item) => api.tryDel(`${path}/${item.id}`).catch(() => undefined)),
		);
	};

	const llm: LlmO11y = {
		seedLlmTrace: async () => {
			const traceId = randomTraceId();
			const rootSpanId = randomSpanId();
			const rootName = `e2e-llm-root-${Date.now()}`;
			const start = Date.now() - 30_000;
			const resources = { 'service.name': 'e2e-llm-explorer' };
			await seedTracesViaSeeder(page.request, [
				{
					timestamp: new Date(start).toISOString(),
					trace_id: traceId,
					span_id: rootSpanId,
					name: rootName,
					kind: 2,
					duration: 'PT0.5S',
					resources,
					attributes: {},
				},
				{
					timestamp: new Date(start + 10).toISOString(),
					trace_id: traceId,
					span_id: randomSpanId(),
					parent_span_id: rootSpanId,
					name: 'chat gpt-4o',
					kind: 3,
					duration: 'PT0.3S',
					resources,
					attributes: {
						'gen_ai.request.model': 'gpt-4o',
						'gen_ai.operation.name': 'chat',
						'gen_ai.usage.input_tokens': 12,
						'gen_ai.usage.output_tokens': 34,
					},
				},
			]);
			return { traceId, rootSpanId, rootName };
		},

		gotoExplorer: async () => {
			await quickFiltersDriver(page).dismissAnnouncement();
			await page.goto(LLM_EXPLORER_PATH);
			await expect(page.getByTestId('llm-observability-explorer')).toBeVisible();
		},

		traceRow: (traceId) => page.getByTestId(`traces-table-row-${traceId}`),

		waitForTraceRow: async (traceId) => {
			allowFor(SEEDED_TEST_BUDGET);
			await expect(async () => {
				await page.getByTestId('explorer-run-query-btn').click();
				await expect(llm.traceRow(traceId)).toBeVisible({ timeout: 5_000 });
			}).toPass({ timeout: SEEDED_DATA_TIMEOUT });
		},

		// The trace id cell is a link that stops propagation, so the row's own
		// click handler is reached through another cell.
		openTraceRow: async ({ traceId, rootName }) => {
			await llm.traceRow(traceId).getByText(rootName, { exact: true }).click();
			await page.waitForURL(new RegExp(`/trace/${traceId}`));
		},

		waterfallRow: (spanId) => page.getByTestId(`cell-0-${spanId}`),

		openQuickFilterSettings: () => quickFiltersDriver(page).openSettings(),
		quickFilterSettings: () => quickFiltersDriver(page).settingsPanel(),

		gotoPricing: async () => {
			await page.goto(LLM_PRICING_PATH);
			await page
				.getByTestId(LLM_PRICING_PAGE_TESTID)
				.waitFor({ state: 'visible' });
		},

		gotoAttributeMapping: async () => {
			await page.goto(ATTRIBUTE_MAPPING_PATH);
			await page
				.getByTestId(ATTRIBUTE_MAPPING_PAGE_TESTID)
				.waitFor({ state: 'visible' });
		},

		mapping: {
			addGroup: () => page.getByTestId('add-group-row'),
			groupDrawer: () => page.getByTestId('group-form-drawer'),
			groupName: () => page.getByTestId('group-form-name'),
			addGroupAttribute: () => page.getByTestId('group-form-attribute-add'),
			groupAttribute: (index) => page.getByTestId(`group-form-attribute-${index}`),
			saveGroup: () => page.getByTestId('group-form-save'),
			groupHeader: (name) =>
				page.locator('[data-testid^="group-expand-"]').filter({ hasText: name }),
			addMapper: () => page.locator('[data-testid^="add-mapper-"]'),
			mapperDrawer: () => page.getByTestId('mapper-form-drawer'),
			mapperTarget: () => page.getByTestId('mapper-form-target'),
			mapperSource: (index) => page.getByTestId(`mapper-form-source-${index}`),
			saveMapper: () => page.getByTestId('mapper-form-save'),
			unsavedChanges: () => page.getByTestId('unsaved-changes'),
			tab: (name) => page.getByRole('tab', { name }),
			testTab: () => page.getByTestId('test-tab'),
			runTest: () => page.getByTestId('run-test-button'),
			testError: () => page.getByTestId('test-error'),
			testResults: () => page.getByTestId('test-results'),
			saveChanges: () => page.getByTestId('save-changes-btn'),
		},

		pricing: {
			addModelCost: () => page.getByTestId('add-model-cost-btn'),
			modelIdInput: () => page.getByTestId('drawer-model-id-input'),
			patternInput: () => page.getByTestId('drawer-pattern-input'),
			addPattern: () => page.getByTestId('drawer-pattern-add-btn'),
			inputCost: () => page.getByTestId('drawer-input-cost'),
			outputCost: () => page.getByTestId('drawer-output-cost'),
			save: () => page.getByTestId('drawer-save-btn'),
			table: () => page.getByTestId('model-costs-table'),
			modelName: (modelName) =>
				page
					.locator('[data-testid^="model-cell-name-"]')
					.filter({ hasText: modelName }),
		},

		toast: (text) => page.getByText(text),

		deletePricingRules: (modelNames) => {
			const wanted = new Set(modelNames);
			return deleteAll(
				'/api/v1/llm_pricing_rules',
				'/api/v1/llm_pricing_rules?offset=0&limit=100',
				(rule) => wanted.has(rule.modelName),
			);
		},

		deleteSpanMapperGroups: (names) => {
			const wanted = new Set(names);
			return deleteAll(
				'/api/v1/span_mapper_groups',
				'/api/v1/span_mapper_groups',
				(group) => wanted.has(group.name),
			);
		},
	};

	return llm;
}

export const withLlmO11y: Layer<{ llm: LlmO11y }> = driver('llm', ({ page }) =>
	llmO11yDriver(page),
);

/** The AI-observability `test`. */
export const test = withLlmO11y(kit);
export { expect, onAdminPage } from './kit';
