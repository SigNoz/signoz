import { expect, type Locator, type Page } from '@playwright/test';

import { SEEDED_DATA_TIMEOUT } from './kit';

/**
 * The query-search box: the CodeMirror expression editor, its Run button, and
 * the URL param the expression is encoded into.
 *
 * `compositeQuery` is on the way out — the query-URL serializer work replaces it
 * with flat leaf params. Every read and write of an expression in the suite goes
 * through this module, so that migration lands in one file rather than in forty
 * specs. Spread {@link expressionParams} at call sites rather than spelling the
 * key out.
 */

const EXPRESSION_PARAM = 'compositeQuery';
const EDITOR = '.query-where-clause-editor .cm-content';

interface CompositeQuery {
	builder?: { queryData?: { filter?: { expression?: string } }[] };
}

/**
 * Three outcomes, kept distinct. Collapsing `malformed` into `''` would make
 * "the filter was cleared" pass against a URL carrying garbage.
 */
export type ExpressionState =
	| { kind: 'absent'; expression: '' }
	| { kind: 'ok'; expression: string }
	| { kind: 'malformed'; expression: ''; raw: string };

/**
 * `dataSource` is required on an explorer: a query without one is filled from
 * the metrics defaults, and the logs or traces list never runs.
 */
export function expressionParam(
	expression: string,
	dataSource?: 'logs' | 'traces',
): string {
	return encodeURIComponent(
		JSON.stringify({
			queryType: 'builder',
			builder: {
				queryData: [
					{
						...(dataSource ? { dataSource } : {}),
						filter: { expression },
						filters: { items: [], op: 'AND' },
					},
				],
			},
		}),
	);
}

export function expressionParams(
	expression: string,
	dataSource?: 'logs' | 'traces',
): Record<string, string> {
	return { [EXPRESSION_PARAM]: expressionParam(expression, dataSource) };
}

export interface QuerySearch {
	editor(): Locator;
	runButton(): Locator;
	cancelButton(): Locator;
	/** Type an expression into the box and press Run, then wait for the URL. */
	apply(expression: string): Promise<void>;
	/** Press Run without touching the box — the staged-expression path. */
	run(): Promise<void>;
	/** The expression encoded in the URL, or `''` when unset. Throws if corrupt. */
	read(): string;
	readState(): ExpressionState;
	expectExpression(expression: string): Promise<void>;
	expectContains(fragment: string): Promise<void>;
}

/**
 * `runTestId` names the Run button. `.run-query-btn` is shared with every
 * drawer tab that has its own query, so the bare class resolves to several
 * elements and each click fails on strict mode.
 */
export function querySearchDriver(
	page: Page,
	{ runTestId }: { runTestId: string },
): QuerySearch {
	const readState = (): ExpressionState => {
		const raw = new URL(page.url()).searchParams.get(EXPRESSION_PARAM);
		if (!raw) {
			return { kind: 'absent', expression: '' };
		}
		// The app writes `encodeURIComponent(JSON.stringify(query))` into a
		// URLSearchParams value, so one decode remains after `searchParams.get`.
		let json = raw;
		try {
			json = decodeURIComponent(raw);
		} catch {
			// A hand-written deep link arrives already decoded.
		}
		try {
			const parsed = JSON.parse(json) as CompositeQuery;
			return {
				kind: 'ok',
				expression: parsed.builder?.queryData?.[0]?.filter?.expression ?? '',
			};
		} catch {
			return { kind: 'malformed', expression: '', raw };
		}
	};

	const read = (): string => {
		const state = readState();
		if (state.kind === 'malformed') {
			throw new Error(
				`${EXPRESSION_PARAM} is not decodable JSON — got \`${state.raw.slice(0, 200)}\``,
			);
		}
		return state.expression;
	};

	const search: QuerySearch = {
		editor: () => page.locator(EDITOR).first(),
		runButton: () => page.getByTestId(runTestId),
		cancelButton: () => page.getByTestId(`${runTestId}-cancel`),
		readState,
		read,

		run: async () => {
			await search.runButton().click();
		},

		apply: async (expression) => {
			const editor = search.editor();
			// The editor mounts with the list's first response, not with the shell.
			await expect(editor).toBeVisible({ timeout: SEEDED_DATA_TIMEOUT });
			// The caret can jump once after mount and rotate typed text, so retype
			// until the editor holds exactly the expression.
			await expect(async () => {
				await editor.click();
				await page.keyboard.press('ControlOrMeta+a');
				await page.keyboard.press('Delete');
				if (expression) {
					await page.keyboard.insertText(expression);
				}
				// An empty editor renders its placeholder as text.
				if (expression) {
					await expect(editor).toHaveText(expression, { timeout: 1_000 });
				} else {
					await expect(editor.locator('.cm-placeholder')).toHaveCount(1, {
						timeout: 1_000,
					});
				}
			}).toPass({ timeout: 15_000 });
			// Typing opens the suggestion popover, which covers the Run button.
			await page.keyboard.press('Escape');
			await search.run();
			await expect(async () => {
				expect(read()).toBe(expression);
			}).toPass({ timeout: 15_000 });
		},

		expectExpression: async (expression) => {
			await expect(async () => {
				expect(read()).toBe(expression);
			}).toPass();
		},

		expectContains: async (fragment) => {
			await expect(async () => {
				expect(read()).toContain(fragment);
			}).toPass();
		},
	};

	return search;
}
