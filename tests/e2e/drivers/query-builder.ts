/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import {
	expect,
	type Locator,
	type Page,
	type Request,
} from '@playwright/test';

import { watchConsole, type ConsoleWatch } from '../helpers/common';
import { isQueryRange } from '../helpers/query-range-mock';
import { dismissQuickFiltersAnnouncement } from '../helpers/quick-filters';

import { driver, kit } from './kit';

export const EXPLORER = {
	logs: '/logs/logs-explorer',
	traces: '/traces-explorer',
} as const;

/** Inside the golden dataset's window. */
export const RELATIVE_TIME = '6h';

/** One entry of a v5 `query_range` body's `compositeQuery.queries`. */
export interface V5Query {
	type: string;
	spec: {
		name?: string;
		signal?: string;
		disabled?: boolean;
		filter?: { expression?: string };
		aggregations?: { expression?: string }[];
		groupBy?: { name: string }[];
		having?: { expression?: string };
		order?: { key: { name: string }; direction: string }[];
		limit?: number;
		stepInterval?: number;
		[key: string]: unknown;
	};
}

export interface V5Body {
	requestType: string;
	compositeQuery: { queries: V5Query[] };
}

export interface FilterEditor {
	root(): Locator;
	/** The contenteditable CodeMirror surface. */
	content(): Locator;
	/** Replaces the expression by typing it key by key. */
	type(text: string): Promise<void>;
	/** Appends at the caret without clearing. */
	append(text: string): Promise<void>;
	clear(): Promise<void>;
	press(key: string): Promise<void>;
	/** The document text, placeholder excluded, lines joined with `\n`. */
	expression(): Promise<string>;
	lineCount(): Locator;
	/** The open autocomplete popup. */
	suggestions(): Locator;
	suggestion(label: string | RegExp): Locator;
}

export interface QueryBlock {
	root(): Locator;
	filter: FilterEditor;
	/** The filter's status icon: shown only while unfocused and non-empty. */
	filterStatus(): Locator;
	aggregation: FilterEditor;
}

export interface QuickFilterValue {
	checkbox(): Locator;
	/** Toggles the value; returns the query_range bodies the toggle fired. */
	toggle(): Promise<V5Body[]>;
}

/** The explorer's tab, carried in the `panelTypes` param. */
export type ExplorerView = 'list' | 'graph' | 'table';

export interface OpenOptions {
	/** Serialised the way the app writes it. */
	query?: unknown;
	/** A `compositeQuery` value sent as given, for malformed input. */
	raw?: string;
	view?: ExplorerView;
}

export interface QueryBuilderDriver {
	/**
	 * Resolves once the page's own first query_range has answered: the explorer
	 * rewrites its URL and re-mounts the builder until then, which drops
	 * keystrokes. Returns the bodies that load fired.
	 */
	openExplorer(path: string, options?: OpenOptions): Promise<V5Body[]>;
	query(name: string): QueryBlock;
	runButton(): Locator;
	/** Clicks Run; returns every query_range body the click fired. */
	run(): Promise<V5Body[]>;
	/**
	 * Ctrl/Cmd+Enter from the focused field; returns the fired bodies. Waits two
	 * frames first: editor changes reach React state on its next scheduler task,
	 * and a keypress inside the same frame as the last keystroke reads the
	 * previous render — a gap no person can produce.
	 */
	runShortcut(): Promise<V5Body[]>;
	/** A value in an explorer's checkbox quick filter, by its header title. */
	quickFilter(title: string, value: string): QuickFilterValue;
	/** The spec of query `name` in the first body that has it. */
	spec(bodies: V5Body[], name: string): V5Query['spec'];
	/** Every query_range body sent since the test started. */
	sent(): V5Body[];
	/** The URL's `compositeQuery`, parsed. */
	urlQuery(): Record<string, unknown> | null;
	console: ConsoleWatch;
}

/** CodeMirror renders its placeholder inside the empty line. */
const EDITOR_DOC = async (root: Locator): Promise<string> => {
	const lines = root.locator('.cm-content .cm-line');
	const texts = await lines.allTextContents();
	const placeholders = await lines.evaluateAll((nodes) =>
		nodes.map((node) => node.querySelector('.cm-placeholder')?.textContent ?? ''),
	);
	return texts
		.map((text, i) =>
			placeholders[i] ? text.replace(placeholders[i], '') : text,
		)
		.join('\n');
};

function editorAt(page: Page, root: () => Locator): FilterEditor {
	const content = (): Locator => root().locator('.cm-content');
	const editor: FilterEditor = {
		root,
		content,
		async type(text) {
			await editor.clear();
			await page.keyboard.type(text);
		},
		async append(text) {
			await content().click();
			await page.keyboard.press('End');
			await page.keyboard.type(text);
		},
		async clear() {
			await content().click();
			await page.keyboard.press('ControlOrMeta+a');
			await page.keyboard.press('Backspace');
			await expect.poll(() => EDITOR_DOC(root())).toBe('');
		},
		press: (key) => page.keyboard.press(key),
		expression: () => EDITOR_DOC(root()),
		lineCount: () => root().locator('.cm-line'),
		suggestions: () => page.locator('.cm-tooltip-autocomplete'),
		suggestion: (label) =>
			page
				.locator('.cm-tooltip-autocomplete [role="option"]')
				.filter({ hasText: label }),
	};
	return editor;
}

function queryBuilderDriver(page: Page): QueryBuilderDriver {
	const bodies: V5Body[] = [];
	page.on('request', (request: Request) => {
		if (isQueryRange(request.url()) && request.method() === 'POST') {
			bodies.push(request.postDataJSON() as V5Body);
		}
	});
	const consoleWatch = watchConsole(page, {
		// ANTLR reports every partial expression on console.error, prefixed
		// with its position (`line 1:14 ...`).
		ignore: ['line 1:', 'line 2:', 'line 3:'],
	});

	const firedBy = async (action: () => Promise<void>): Promise<V5Body[]> => {
		const before = bodies.length;
		await Promise.all([
			page.waitForResponse((r) => isQueryRange(r.url())),
			action(),
		]);
		return bodies.slice(before);
	};

	const qb: QueryBuilderDriver = {
		async openExplorer(path, { query, raw, view } = {}) {
			await dismissQuickFiltersAnnouncement(page);
			const params = [`relativeTime=${RELATIVE_TIME}`];
			if (view) {
				params.push(`panelTypes=${encodeURIComponent(JSON.stringify(view))}`);
			}
			const composite =
				raw ??
				(query === undefined
					? undefined
					: encodeURIComponent(JSON.stringify(query)));
			if (composite !== undefined) {
				params.push(`compositeQuery=${composite}`);
			}
			const fired = await firedBy(async () => {
				await page.goto(`${path}?${params.join('&')}`);
			});
			await expect(qb.query('A').filter.content()).toBeVisible();
			return fired;
		},
		query(name) {
			const root = (): Locator => page.getByTestId(`query-${name}`);
			return {
				root,
				filter: editorAt(page, () =>
					root().getByTestId('query-where-clause-editor'),
				),
				filterStatus: () => root().getByTestId('query-validation-status'),
				aggregation: editorAt(page, () =>
					root().getByTestId('query-aggregation-editor'),
				),
			};
		},
		runButton: () => page.locator('[data-run-query-btn]').first(),
		run: () => firedBy(() => qb.runButton().click()),
		async runShortcut() {
			await page.evaluate(
				() =>
					new Promise<void>((resolve) => {
						// Runs in the browser; the e2e tsconfig has no DOM lib.
						const { requestAnimationFrame: frame } = globalThis as unknown as {
							requestAnimationFrame(this: void, callback: () => void): number;
						};
						frame(() => frame(() => resolve()));
					}),
			);
			return firedBy(() => page.keyboard.press('ControlOrMeta+Enter'));
		},
		quickFilter(title, value) {
			const checkbox = (): Locator =>
				page.getByTestId(`checkbox-${title}-${value}`);
			return {
				checkbox,
				toggle: () => firedBy(() => checkbox().click()),
			};
		},
		spec(fired, name) {
			for (const body of fired) {
				const match = body.compositeQuery?.queries?.find(
					(q) => q.spec?.name === name,
				);
				if (match) {
					return match.spec;
				}
			}
			throw new Error(`no query ${name} in ${fired.length} query_range bodies`);
		},
		sent: () => bodies,
		urlQuery() {
			const raw = new URL(page.url()).searchParams.get('compositeQuery');
			if (!raw) {
				return null;
			}
			// The app encodes before URLSearchParams encodes again.
			return JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
		},
		console: consoleWatch,
	};
	return qb;
}

const withQueryBuilder = driver('qb', ({ page }) => queryBuilderDriver(page));

export const test = withQueryBuilder(kit);

export { expect } from './kit';
