import { expect, type Locator, type Page } from '@playwright/test';

// Locators and interactions for the V2 panel editor.
//
// Two gotchas: antd popups portal to `document.body` (a testid finds the
// TRIGGER, options live in a detached `.ant-select-dropdown`), and config
// sections only mount their editors while open.

// ─── Labels ──────────────────────────────────────────────────────────────

export const EditorText = {
	title: 'Configure panel',
	unsavedBadge: 'Unsaved Changes',
	save: 'Save changes',
	switchToView: 'Switch to View Mode',
	discardTitle: 'Discard changes?',
	discardBody: 'Your unsaved edits to this panel will be lost.',
	savedToast: 'Panel saved',
	lockedReason: 'This dashboard is locked',
	runQuery: 'Run Query',
} as const;

export const QueryTab = {
	builder: 'Query Builder',
	clickhouse: 'ClickHouse Query',
	promql: 'PromQL',
} as const;

/** SettingsSection titles, as rendered — `sectionTestId` slugifies them. */
export const Section = {
	visualization: 'Visualization',
	formatting: 'Formatting & Units',
	axes: 'Axes',
	legend: 'Legend',
	chartAppearance: 'Chart Appearance',
	buckets: 'Histogram / Buckets',
	thresholds: 'Thresholds',
	contextLinks: 'Context Links',
} as const;

/** Slugified as `title.toLowerCase().replace(/\s+/g,'-')` — `&` and `/` survive. */
export function sectionTestId(title: string): string {
	return `config-section-${title.toLowerCase().replace(/\s+/g, '-')}`;
}

// ─── Shell locators ──────────────────────────────────────────────────────

/**
 * `panel-editor-v2` is NOT unique — the ResizablePanelGroup derives the same
 * testid from its `id` (also the localStorage layout key, so unrenameable).
 * `:not([data-group])` picks the page root.
 */
const EDITOR_ROOT = '[data-testid="panel-editor-v2"]:not([data-group])';

export const editor = {
	root: (page: Page): Locator => page.locator(EDITOR_ROOT),
	title: (page: Page): Locator => page.getByTestId('panel-editor-v2-title'),
	description: (page: Page): Locator =>
		page.getByTestId('panel-editor-v2-description'),
	save: (page: Page): Locator => page.getByTestId('panel-editor-v2-save'),
	close: (page: Page): Locator => page.getByTestId('panel-editor-v2-close'),
	unsavedBadge: (page: Page): Locator =>
		page.getByTestId('panel-editor-v2-unsaved-badge'),
	switchToView: (page: Page): Locator =>
		page.getByTestId('panel-editor-v2-switch-to-view'),
	typeSwitcher: (page: Page): Locator =>
		page.getByTestId('panel-editor-v2-type-switcher'),
	queryBuilder: (page: Page): Locator =>
		page.getByTestId('panel-editor-v2-query-builder'),
};

// ─── Sections ────────────────────────────────────────────────────────────

export function sectionToggle(page: Page, title: string): Locator {
	return page.getByTestId(sectionTestId(title));
}

/** Idempotent: a blind click on an open section would collapse it. */
export async function expandSection(page: Page, title: string): Promise<void> {
	const toggle = sectionToggle(page, title);
	await expect(toggle).toBeVisible();
	if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
		await toggle.click();
	}
	await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}

export async function collapseSection(
	page: Page,
	title: string,
): Promise<void> {
	const toggle = sectionToggle(page, title);
	if ((await toggle.getAttribute('aria-expanded')) === 'true') {
		await toggle.click();
	}
	await expect(toggle).toHaveAttribute('aria-expanded', 'false');
}

// ─── antd Select helpers ─────────────────────────────────────────────────

/**
 * Open a Select and resolve ITS dropdown via `aria-controls`. A closing
 * dropdown still matches `:not(.ant-select-dropdown-hidden)`, so opening two
 * Selects in a row otherwise trips strict mode.
 */
async function openDropdown(
	page: Page,
	triggerTestId: string,
): Promise<Locator> {
	const trigger = page.getByTestId(triggerTestId);
	await trigger.click();
	const listId = await trigger.locator('input').getAttribute('aria-controls');
	const dropdown = listId
		? page
				.locator(`#${listId}`)
				.locator('xpath=ancestor::div[contains(@class,"ant-select-dropdown")][1]')
		: page
				.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
				.last();
	await expect(dropdown).toBeVisible();
	return dropdown;
}

/** Pick an option from an antd Select identified by the trigger's testid. */
export async function selectOption(
	page: Page,
	triggerTestId: string,
	optionLabel: string,
): Promise<void> {
	const dropdown = await openDropdown(page, triggerTestId);
	await dropdown
		.locator('.ant-select-item-option')
		.filter({ hasText: optionLabel })
		.first()
		.click();
}

/** Searches first — long option lists are virtualised (needed for unit pickers). */
export async function searchAndSelectOption(
	page: Page,
	triggerTestId: string,
	searchTerm: string,
	optionLabel: string,
): Promise<void> {
	const dropdown = await openDropdown(page, triggerTestId);
	await page.getByTestId(triggerTestId).locator('input').fill(searchTerm);
	await dropdown
		.locator('.ant-select-item-option')
		.filter({ hasText: optionLabel })
		.first()
		.click();
}

/** Read the option labels a Select currently offers, plus their disabled state. */
export async function selectOptions(
	page: Page,
	triggerTestId: string,
): Promise<{ label: string; disabled: boolean }[]> {
	const dropdown = await openDropdown(page, triggerTestId);
	return dropdown.locator('.ant-select-item-option').evaluateAll((nodes) =>
		nodes.map((node) => ({
			label: node.textContent?.trim() ?? '',
			disabled: node.classList.contains('ant-select-item-option-disabled'),
		})),
	);
}

// ─── Segmented / switch controls ─────────────────────────────────────────

/** Segments carry `aria-label`; the testid is on the group. */
export async function setSegment(
	page: Page,
	groupTestId: string,
	label: string,
): Promise<void> {
	await page.getByTestId(groupTestId).locator(`[aria-label="${label}"]`).click();
}

export function segment(
	page: Page,
	groupTestId: string,
	label: string,
): Locator {
	return page.getByTestId(groupTestId).locator(`[aria-label="${label}"]`);
}

// ─── Query builder ───────────────────────────────────────────────────────

/** The Run button has no testid at this call site, so match by role. */
export async function runQuery(page: Page): Promise<void> {
	const response = page.waitForResponse((r) => r.url().includes('/query_range'));
	await page.getByRole('button', { name: EditorText.runQuery }).click();
	await response;
}

export function queryTab(page: Page, label: string): Locator {
	return editor.queryBuilder(page).getByRole('tab', { name: label });
}

/**
 * Pick a metric. An antd AutoComplete: testid is on a wrapper, options are
 * fetched as you type. Required before a new metrics panel can be saved — the
 * backend rejects an empty aggregation with "metric name is required".
 */
export async function selectMetric(
	page: Page,
	metricName: string,
	index = 0,
): Promise<void> {
	const field = page.getByTestId(`metric-name-selector-${index}`);
	await field.click();
	await field.locator('input').fill(metricName);
	const dropdown = page.locator(
		'.ant-select-dropdown:not(.ant-select-dropdown-hidden)',
	);
	await expect(dropdown).toBeVisible();
	await dropdown
		.locator('.ant-select-item-option')
		.filter({ hasText: metricName })
		.first()
		.click();
}

// ─── Save / discard ──────────────────────────────────────────────────────

/** Save is NOT gated on dirty state — a pristine panel still saves. */
export async function savePanel(page: Page): Promise<void> {
	const patch = page.waitForResponse(
		(r) =>
			r.request().method() === 'PATCH' && /\/api\/v2\/dashboards\//.test(r.url()),
	);
	await editor.save(page).click();
	const response = await patch;
	// A rejected patch leaves the editor open, which would surface as an
	// unrelated timeout several lines later.
	expect(
		response.ok(),
		`PATCH ${response.url()} failed: ${response.status()} ${await response.text()}`,
	).toBe(true);
}

/** A dirty panel raises the discard dialog; a pristine one closes immediately. */
export async function closeEditor(
	page: Page,
	options?: { expectDirty?: boolean; keepEditing?: boolean },
): Promise<void> {
	await editor.close(page).click();
	if (!options?.expectDirty) {
		return;
	}
	await expect(page.getByTestId('panel-editor-v2-discard-modal')).toBeVisible();
	await page
		.getByTestId(
			options.keepEditing
				? 'panel-editor-v2-discard-cancel'
				: 'panel-editor-v2-discard-confirm',
		)
		.click();
}

// ─── Patch capture ───────────────────────────────────────────────────────

export interface PatchOperation {
	op: string;
	path: string;
	value?: unknown;
}

/**
 * Record the RFC-6902 ops sent on save. Stricter than re-reading the dashboard:
 * catches a whole-spec replace that would clobber concurrent edits.
 */
export function capturePatchOps(page: Page): PatchOperation[][] {
	const batches: PatchOperation[][] = [];
	page.on('request', (request) => {
		if (
			request.method() !== 'PATCH' ||
			!/\/api\/v2\/dashboards\//.test(request.url())
		) {
			return;
		}
		const body = request.postDataJSON() as PatchOperation[] | null;
		if (body) {
			batches.push(body);
		}
	});
	return batches;
}
