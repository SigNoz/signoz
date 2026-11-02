/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

import { PanelKind } from '../helpers/dashboard-spec';

import { EDITOR_ROOT } from './dashboards';
import { driver } from './kit';
import { newPanelDriver } from './panel-editor/picker';
import { type QueryPane, queryPaneAt } from './panel-editor/query';
import { type EditorSelects, selectsAt } from './panel-editor/select';
import { type TextPane, textPaneAt } from './panel-editor/text';
import {
	type TypeSwitcher,
	typeSwitcherAt,
} from './panel-editor/type-switcher';
import {
	type Chart,
	chartAt,
	type Markdown,
	markdownAt,
	RENDERER_TESTID,
	test as panelsTest,
} from './panels';

// The panel editor; config sections only mount their editors while open.
// Each pane lives in its own part under ./panel-editor.

export const EditorText = {
	title: 'Configure panel',
	lockedReason: 'This dashboard is locked',
	runQuery: 'Run Query',
} as const;

export const QueryTab = {
	promql: 'PromQL',
} as const;

/** SettingsSection titles as rendered. */
export const Section = {
	visualization: 'Visualization',
	formatting: 'Formatting & Units',
	axes: 'Axes',
	legend: 'Legend',
	chartAppearance: 'Chart Appearance',
	thresholds: 'Thresholds',
	contextLinks: 'Context Links',
	/** Text only. */
	panelAppearance: 'Panel appearance',
} as const;

/** Config controls, each testid'd as `panel-editor-v2-<name>`. */
export type EditorControl =
	| 'soft-min'
	| 'soft-max'
	| 'decimals'
	| 'legend-position';

export interface PatchOperation {
	op: string;
	path: string;
	value?: unknown;
}

export interface PanelEditor extends EditorSelects, TypeSwitcher {
	root(): Locator;
	title(): Locator;
	description(): Locator;
	saveButton(): Locator;
	unsavedBadge(): Locator;
	switchToView(): Locator;
	/** Save is not gated on dirty state; fails the test on a rejected PATCH. */
	save(): Promise<void>;
	/** Clicks Save and returns whether the PATCH was accepted, for rejection paths. */
	trySave(): Promise<{ ok: boolean; body: string }>;
	/**
	 * A dirty panel raises the discard dialog; `expectDirty` answers it, with
	 * `keepEditing` choosing Cancel over Discard.
	 */
	close(options?: {
		expectDirty?: boolean;
		keepEditing?: boolean;
	}): Promise<void>;
	discardModal(): Locator;
	/** Records the RFC-6902 ops each save sends. */
	capturePatches(): PatchOperation[][];
	section: {
		toggle(title: string): Locator;
		/** Idempotent: a blind click on an open section collapses it. */
		expand(title: string): Promise<void>;
		collapse(title: string): Promise<void>;
	};
	control(name: EditorControl): Locator;
	/**
	 * A ConfigTiles choice. The radio input is visually hidden, so the label
	 * carrying `<group testid>-<value>` is the click target.
	 */
	tile(name: EditorControl, value: string): Locator;
	setTile(name: EditorControl, value: string): Promise<void>;
	/** The tile's radio input, for `toBeChecked`. */
	tileInput(name: EditorControl, value: string): Locator;
	/**
	 * Whether a refresh or tab close would be held by the editor's
	 * `beforeunload` prompt, checked without leaving the page.
	 */
	blocksUnload(): Promise<boolean>;
	text: TextPane;
	/** The heading text, which carries no testid. */
	heading(): Locator;
	/** A disabled Save swallows pointer events, so this hovers its tooltip trigger. */
	hoverSave(): Promise<void>;
	query: QueryPane;
	preview: {
		root(): Locator;
		renderer(kind: PanelKind): Locator;
		chart: Chart;
		markdown: Markdown;
	};
}

function isDashboardPatch(method: string, url: string): boolean {
	return method === 'PATCH' && /\/api\/v2\/dashboards\//.test(url);
}

function editorDriver(page: Page): PanelEditor {
	const byTestId = (suffix: string): Locator =>
		page.getByTestId(`panel-editor-v2-${suffix}`);
	const preview = (): Locator => page.getByTestId('preview-pane');
	const sectionToggle = (title: string): Locator =>
		page.getByTestId(
			`config-section-${title.toLowerCase().replace(/\s+/g, '-')}`,
		);

	const editor: PanelEditor = {
		root: () => page.locator(EDITOR_ROOT),
		title: () => byTestId('title'),
		description: () => byTestId('description'),
		saveButton: () => byTestId('save'),
		unsavedBadge: () => byTestId('unsaved-badge'),
		switchToView: () => byTestId('switch-to-view'),
		async save() {
			const { ok, body } = await editor.trySave();
			// A rejected patch leaves the editor open, which would otherwise surface
			// as an unrelated timeout several lines later.
			expect(ok, `dashboard PATCH failed: ${body}`).toBe(true);
		},
		async trySave() {
			const [response] = await Promise.all([
				page.waitForResponse((r) =>
					isDashboardPatch(r.request().method(), r.url()),
				),
				byTestId('save').click(),
			]);
			return { ok: response.ok(), body: await response.text() };
		},
		async close(options) {
			await byTestId('close').click();
			if (!options?.expectDirty) {
				return;
			}
			await expect(byTestId('discard-modal')).toBeVisible();
			await byTestId(
				options.keepEditing ? 'discard-cancel' : 'discard-confirm',
			).click();
		},
		discardModal: () => byTestId('discard-modal'),
		capturePatches() {
			const batches: PatchOperation[][] = [];
			page.on('request', (request) => {
				if (!isDashboardPatch(request.method(), request.url())) {
					return;
				}
				const body = request.postDataJSON() as PatchOperation[] | null;
				if (body) {
					batches.push(body);
				}
			});
			return batches;
		},
		section: {
			toggle: sectionToggle,
			async expand(title) {
				const toggle = sectionToggle(title);
				await expect(toggle).toBeVisible();
				if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
					await toggle.click();
				}
				await expect(toggle).toHaveAttribute('aria-expanded', 'true');
			},
			async collapse(title) {
				const toggle = sectionToggle(title);
				if ((await toggle.getAttribute('aria-expanded')) === 'true') {
					await toggle.click();
				}
				await expect(toggle).toHaveAttribute('aria-expanded', 'false');
			},
		},
		control: (name) => byTestId(name),
		tile: (name, value) => byTestId(`${name}-${value}`),
		async setTile(name, value) {
			await editor.tile(name, value).click();
		},
		tileInput: (name, value) => editor.tile(name, value).locator('input'),
		blocksUnload: () =>
			page.evaluate(() => {
				const event = new Event('beforeunload', { cancelable: true });
				window.dispatchEvent(event);
				return event.defaultPrevented;
			}),
		text: textPaneAt(page),
		...selectsAt(page),
		heading: () => editor.root().getByText(EditorText.title),
		async hoverSave() {
			await page
				.locator('[data-slot="tooltip-trigger"]')
				.filter({ has: byTestId('save') })
				.hover();
		},
		...typeSwitcherAt(page),
		query: queryPaneAt(page, EditorText.runQuery),
		preview: {
			root: preview,
			renderer: (kind) => preview().getByTestId(RENDERER_TESTID[kind]),
			chart: chartAt(page, () => preview().getByTestId('uplot-main-div')),
			markdown: markdownAt(() =>
				preview().getByTestId(RENDERER_TESTID[PanelKind.Text]),
			),
		},
	};

	return editor;
}

const withEditor = driver('editor', ({ page }) => editorDriver(page));
const withNewPanel = driver('newPanel', ({ page }) => newPanelDriver(page));

export const test = withNewPanel(withEditor(panelsTest));

export * from './panels';
export * from './panel-editor/picker';
export * from './panel-editor/query';
export * from './panel-editor/select';
export * from './panel-editor/text';
export * from './panel-editor/type-switcher';
