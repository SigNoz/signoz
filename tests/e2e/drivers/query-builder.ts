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

import { watchConsole } from '../helpers/common';
import { isQueryRange } from '../helpers/query-range-mock';
import { dismissQuickFiltersAnnouncement } from '../helpers/quick-filters';

import { driver, kit } from './kit';
import { EXPLORER, RELATIVE_TIME } from './query-builder/constants';
import {
	addOnsAt,
	exactly,
	metricAt,
	openSelect,
} from './query-builder/controls';
import { afterRender, editorAt } from './query-builder/editor';
import type { QueryBuilderDriver, V5Body } from './query-builder/types';

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

	// Waits on a request the action started: a response to one already in
	// flight (e.g. after a structural edit) would end the wait too early.
	const firedBy = async (action: () => Promise<void>): Promise<V5Body[]> => {
		const before = bodies.length;
		const answered = page
			.waitForRequest((r) => isQueryRange(r.url()) && r.method() === 'POST')
			.then((request) => request.response());
		await action();
		await answered;
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
			const url = `${path}?${params.join('&')}`;
			// The metrics explorer runs nothing until a metric is chosen; its
			// settle point is the metric list instead.
			if (path === EXPLORER.metrics) {
				await Promise.all([
					page.waitForResponse((r) => r.url().includes('/api/v2/metrics')),
					page.goto(url),
				]);
				await expect(qb.query('A').filter.content()).toBeVisible();
				return [];
			}
			const fired = await firedBy(async () => {
				await page.goto(url);
			});
			await expect(qb.query('A').filter.content()).toBeVisible();
			return fired;
		},
		query(name) {
			const root = (): Locator => page.getByTestId(`query-${name}`);
			// Index-suffixed testids follow screen position, not the query's
			// name (A, C, B after a delete and re-add): match them in the block.
			const signalSelect = (): Locator =>
				root().locator('[data-testid^="query-data-source-selector-"]');
			return {
				root,
				filter: editorAt(page, () =>
					root().getByTestId('query-where-clause-editor'),
				),
				filterStatus: () => root().getByTestId('query-validation-status'),
				aggregation: editorAt(page, () =>
					root().getByTestId('query-aggregation-editor'),
				),
				step: () => root().getByTestId('input-Seconds'),
				metric: metricAt(page, root),
				addOns: addOnsAt(page, root),
				actions: () => root().getByTestId('query-actions'),
				menuItem: (action) =>
					page.getByTestId(`query-actions-item-${action}-query`),
				async clone() {
					await root().getByTestId('query-actions').click();
					await page.getByTestId('query-actions-item-clone-query').click();
					await afterRender(page);
				},
				async delete() {
					await root().getByTestId('query-actions').click();
					await page.getByTestId('query-actions-item-delete-query').click();
					await expect(root()).toHaveCount(0);
					await afterRender(page);
				},
				async toggleVisibility() {
					await root().getByTestId('qb-entity-visibility').click();
					// The icon is the only visible change and carries no state.
					await afterRender(page);
				},
				collapse: () => root().getByTestId('qb-entity-collapse').click(),
				signal: () => signalSelect().locator('.ant-select-selection-item'),
				async setSignal(label) {
					const options = await openSelect(page, signalSelect());
					await options.filter({ hasText: exactly(label) }).click();
					await expect(this.signal()).toHaveText(label);
				},
			};
		},
		tab: (queryType) => page.getByTestId(`query-type-tab-${queryType}`),
		promql: () => page.getByTestId('promql-query-input').first(),
		async addQuery(name) {
			await page.getByTestId('add-new-query-button').click();
			const block = qb.query(name);
			await expect(block.filter.content()).toBeVisible();
			return block;
		},
		queryNames: () =>
			page.locator('[data-testid^="query-"]').evaluateAll((nodes) =>
				nodes
					.map((node) => node.getAttribute('data-testid') ?? '')
					.filter((id) => /^query-[A-Z]$/.test(id))
					.map((id) => id.slice('query-'.length)),
			),
		formula(name) {
			const root = (): Locator => page.getByTestId(`formula-${name}`);
			return {
				root,
				expression: () => root().getByTestId('formula-expression'),
				legend: () => root().getByTestId('formula-legend'),
				async delete() {
					await root().getByTestId('qb-entity-delete').click();
					await expect(root()).toHaveCount(0);
					// The block leaves the DOM before the editor's draft follows.
					await afterRender(page);
				},
			};
		},
		async addFormula(name) {
			await page.getByTestId('add-formula-button').click();
			const formula = qb.formula(name);
			await expect(formula.expression()).toBeVisible();
			return formula;
		},
		traceOperator: {
			root: () => page.getByTestId('trace-operator'),
			// No testid; the label is followed by a "Beta" tag inside the button.
			addButton: () =>
				page.getByRole('button').filter({ hasText: /^Add Trace Matching/ }),
			async add() {
				await qb.traceOperator.addButton().click();
				await expect(qb.traceOperator.editor.content()).toBeVisible();
			},
			async remove() {
				// The only direct button child: the trash icon, no testid.
				await qb.traceOperator.root().locator(':scope > button').click();
				await expect(qb.traceOperator.root()).toHaveCount(0);
			},
			editor: editorAt(page, () => page.getByTestId('trace-operator-editor')),
		},
		async addToDashboard(title) {
			await page.getByTestId('explorer-add-to-dashboard').click();
			const dialog = page.getByTestId('export-panel-dialog');
			await dialog
				.getByTestId('export-dashboard-select')
				.locator('input')
				.fill(title);
			await dialog.locator(`.ant-select-item-option[title="${title}"]`).click();
			await dialog.getByTestId('export-panel-export').click();
			await page.waitForURL(/\/panel\/new\?/);
			await expect(qb.query('A').filter.content()).toBeVisible();
		},
		runButton: () => page.locator('[data-run-query-btn]').first(),
		// No testid on the container.
		logsResults: () => page.locator('.logs-explorer-views'),
		async run() {
			await afterRender(page);
			return firedBy(() => qb.runButton().click());
		},
		async rerunUntil(read, expected) {
			await expect(async () => {
				await expect(qb.runButton()).toHaveText(/Run Query/);
				await afterRender(page);
				await qb.runButton().click();
				await expect.poll(read, { timeout: 3_000 }).toEqual(expected);
			}).toPass({ timeout: 25_000 });
		},
		async runShortcut() {
			await afterRender(page);
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
		latest: (name) =>
			[...bodies]
				.reverse()
				.flatMap((body) => body.compositeQuery?.queries ?? [])
				.find((query) => query.spec?.name === name)?.spec,
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

/** Layers `qb` onto another host's test, e.g. the alert-rule fixtures. */
export const withQueryBuilder = driver('qb', ({ page }) =>
	queryBuilderDriver(page),
);

export const test = withQueryBuilder(kit);

export { expect } from './kit';
export * from './query-builder/constants';
export * from './query-builder/types';
export { reduceToLabel } from './query-builder/controls';
export { withMetricTypes } from './query-builder/seed';
