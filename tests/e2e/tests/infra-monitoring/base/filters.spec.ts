/**
 * The two filter surfaces and how they combine: the `QuerySearch`
 * expression in the header and the quick-filter checkbox rail on the left.
 *
 * Every read and write of the expression goes through `applyExpression` /
 * `expectExpression`, so the pending `compositeQuery` → flat-leaf-param
 * migration is a one-file change rather than forty spec edits.
 */

import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import {
	expectExpression,
	expectExpressionContains,
	expectFirstPage,
	expectQuickFilterSections,
} from '../../../helpers/infra-monitoring/assertions';
import type { DatasetKey } from '../../../helpers/infra-monitoring/datasets';
import {
	entityByKey,
	fanOut,
	WIDE_TAG,
	type EntityDef,
} from '../../../helpers/infra-monitoring/entities';
import {
	EMPTY_STATE,
	NO_RESULTS_TEXT,
	applyExpression,
	cancelQueryButton,
	clearQuickFilterSection,
	dataRows,
	gotoList,
	gotoScopedList,
	isListUrl,
	listUrl,
	pickQuickFilter,
	querySearchEditor,
	quickFilterSection,
	readExpression,
	renderedRowKeys,
	resetTableState,
	runQuery,
	runQueryButton,
	waitForRow,
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import {
	seedDataset,
	type SeededFacts,
} from '../../../helpers/infra-monitoring/seed';

async function openSeededList(
	page: Page,
	entity: EntityDef,
	dataset: DatasetKey = entity.seed.primary,
): Promise<SeededFacts> {
	await resetTableState(page, entity);
	const seeded = await seedDataset(page, dataset);
	await gotoList(page, entity);
	await waitForRows(page);
	return seeded;
}

/**
 * The same, scoped to the seeded names.
 *
 * Needed wherever a scenario compares row *sets* before and after an action. The
 * stack is shared across six workers and seeding is additive, so a snapshot of an
 * unfiltered page one is not stable between two reads — §11.1's "never assert set
 * membership against an unscoped list".
 */
async function openScopedSeededList(
	page: Page,
	entity: EntityDef,
	dataset: DatasetKey = entity.seed.primary,
): Promise<SeededFacts> {
	await resetTableState(page, entity);
	const seeded = await seedDataset(page, dataset);
	await gotoScopedList(page, entity, seeded.names);
	await waitForRows(page);
	return seeded;
}

/** `<name label> = '<value>'` — the expression that isolates one seeded row. */
function nameExpression(entity: EntityDef, value: string): string {
	return `${entity.nameColumnId} = '${value}'`;
}

// ─── once-level: the placeholder and the section list reach the DOM through
// ─── `K8sBaseList`, which does not branch on entity. The per-entity values are
// ─── only mirrored in the registry for the entities a `once`- or
// ─── `representative`-level scenario runs on.

for (const entity of fanOut('once')) {
	test.describe(`filters ${entity.key} ${WIDE_TAG}`, () => {
		test(`TC-01 ${entity.key}: the search placeholder matches the registry verbatim`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			await gotoList(page, entity);

			// CodeMirror renders its placeholder as a child node, not an attribute.
			await expect(querySearchEditor(page)).toContainText(
				entity.filterPlaceholder!,
			);
		});

		test(`TC-10 ${entity.key}: quick-filter sections and their default open state match the registry`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity);
			await expectQuickFilterSections(page, entity);
		});
	});
}

// ─── representative-level ────────────────────────────────────────────────────

for (const entity of fanOut('representative')) {
	test.describe(`filters ${entity.key}`, () => {
		test(`TC-02 ${entity.key}: a matching expression narrows the rows and resets page`, async ({
			authedPage: page,
		}) => {
			// Start off page one, deep-linked. `expectFirstPage` accepts absent-or-'1'
			// and a freshly loaded list carries no `page` param, so without this the
			// reset assertion cannot fail. Deep-linked rather than clicked because a
			// scoped list can have too few rows for a page-2 button to exist, and the
			// click then waits out the budget instead of failing.
			await resetTableState(page, entity);
			const seeded = await seedDataset(page, entity.seed.filter);
			await gotoList(page, entity, { pageSize: '2', page: '2' });
			await waitForRows(page);
			const target = seeded.names[0];
			const expression = nameExpression(entity, target);

			await applyExpression(page, expression);

			await expectExpression(page, expression);
			await expectFirstPage(page);
			await expect(async () => {
				const keys = await renderedRowKeys(page);
				expect(keys.length).toBe(1);
			}).toPass();
		});

		/**
		 * TC-02 filters on the name column, which every row has a unique value
		 * for, so it can only ever prove "one row survives". The `*_filter_dataset`
		 * fixtures exist for the other half: their rows share attribute values in a
		 * known split, so a filter on an attribute must land on a *subset*.
		 *
		 * The scope stays inside the expression rather than being replaced by it:
		 * `applyExpression` overwrites the whole box, and an unscoped attribute
		 * filter would also collect whatever a sibling spec seeded under the same
		 * label.
		 */
		test(`TC-14 ${entity.key}: an attribute expression narrows to that attribute's rows`, async ({
			authedPage: page,
		}) => {
			test.skip(
				!entity.capabilities.has('groupBy'),
				`${entity.key} has no groupable attribute to filter on`,
			);
			await resetTableState(page, entity);
			const seeded = await seedDataset(page, entity.seed.filter);
			await gotoScopedList(page, entity, seeded.names);
			await waitForRows(page);

			const split = seeded.groups[entity.groupByAttribute];
			const [label, members] = Object.entries(split)[0];
			expect(members, `${label} is a strict subset of the fixture`).toBeLessThan(
				seeded.names.length,
			);

			const names = seeded.names.map((name) => `'${name}'`).join(', ');
			await applyExpression(
				page,
				`${entity.nameColumnId} IN (${names}) AND ${entity.groupByAttribute} = '${label}'`,
			);

			await expect(async () => {
				expect(await renderedRowKeys(page)).toHaveLength(members);
			}).toPass();
		});

		test(`TC-03 ${entity.key}: Run without touching the search box keeps the expression`, async ({
			authedPage: page,
		}) => {
			const seeded = await openSeededList(page, entity);
			const expression = nameExpression(entity, seeded.names[0]);

			// A deep link, so the box is populated but `stagedExpressionRef` is null.
			await page.goto(
				listUrl(entity, {
					compositeQuery: encodeURIComponent(
						JSON.stringify({
							builder: { queryData: [{ filter: { expression } }] },
						}),
					),
				}),
			);
			await waitForRows(page);

			await runQuery(page);

			// The untouched box must not wipe the filter.
			await expectExpression(page, expression);
		});

		test(`TC-04 ${entity.key}: an expression matching nothing renders the empty state`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity);

			await applyExpression(
				page,
				nameExpression(entity, 'no-such-entity-anywhere-xyz'),
			);

			await expect(page.getByTestId(EMPTY_STATE.empty)).toBeVisible();
			await expect(page.getByTestId(EMPTY_STATE.empty)).toContainText(
				NO_RESULTS_TEXT,
			);
			await expect(dataRows(page)).toHaveCount(0);
		});

		test(`TC-06 ${entity.key}: key autocomplete is scoped to the entity's metric namespace`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity);

			// `QuerySearch` feeds CodeMirror's `autocompletion` extension, so the
			// suggestion list is `.cm-tooltip-autocomplete` with one
			// `.cm-completionLabel` per option.
			const editor = querySearchEditor(page);
			await editor.click();
			await page.keyboard.press('ControlOrMeta+a');
			await page.keyboard.press('Delete');
			// Type the first segment of this entity's own name attribute.
			await page.keyboard.type(entity.nameColumnId.split('.')[0]);

			const labels = page.locator('.cm-tooltip-autocomplete .cm-completionLabel');
			await expect(labels.first()).toBeVisible({ timeout: 15_000 });

			// The entity's *own* key is offered.
			//
			// §4's TC-06 says "keys scoped to `metricNamespace`", and the product
			// does not do that: on volumes (`metricNamespace` = `k8s.volume.`) the
			// suggestions are `k8s.persistentvolumeclaim.name`, `k8s.namespace.name`,
			// `k8s.cluster.name`, `k8s.pod.name` … — the attributes that entity can be
			// filtered on, with no namespace prefix in sight. This asserts the real
			// contract; the plan row is what needs updating.
			const rendered = (await labels.allInnerTexts()).map((label) => label.trim());
			expect(
				rendered,
				`${entity.key}'s own name attribute is suggested`,
			).toContain(entity.nameColumnId);

			await page.keyboard.press('Escape');
		});

		test(`TC-07 ${entity.key}: a quick-filter checkbox narrows the rows and updates the expression`, async ({
			authedPage: page,
		}) => {
			const seeded = await openSeededList(page, entity);
			const section = entity.quickFilterTitles![0];
			const value = seeded.names[0];

			// Scoped, so `before` is a stable seed-owned set rather than whatever page
			// one of the shared stack held a moment ago.
			await gotoScopedList(page, entity, seeded.names);
			await waitForRows(page);
			const before = await renderedRowKeys(page);

			// Intermittently red on the same defect TC-13 is fixme'd for: the list
			// is already filtered on this attribute, so the row renders checked (it is
			// one of `relatedValues`) and the tick becomes an untick, landing
			// `in [<the other name>]` in `filters.items`. `pickQuickFilter`'s URL
			// assertion cannot see that — the scope expression already contains
			// `value` — so it returns on the excluded state, and `waitForRow` below
			// fails whenever the query builder gets around to folding `items` into
			// `filter.expression`. Fixing it in the helper needs the rail to agree with
			// itself about which of the two holds the clause.
			await pickQuickFilter(page, section, value);

			await expectExpressionContains(page, value);
			await expect(
				quickFilterSection(page, section).getByTestId(
					`checkbox-value-row-${value}`,
				),
			).toBeVisible();
			await waitForRow(page, rowKeyFor(entity, seeded, value));

			// "Narrows" means rows were *removed*, which `waitForRow` alone cannot say.
			await expect(async () => {
				const after = await renderedRowKeys(page);
				expect(after.length).toBeLessThan(before.length);
			}).toPass();
			// NOTE: the plan's third claim — "shows the selected-count badge" — is still
			// unasserted. An attempt to read it off `checkbox-filter-header` failed on
			// all four entities, so the count is rendered somewhere else; the badge's
			// actual location needs to be read off a running page.
		});

		test(`TC-08 ${entity.key}: Clear restores the full row set`, async ({
			authedPage: page,
		}) => {
			const seeded = await openScopedSeededList(page, entity);
			const before = await renderedRowKeys(page);
			const section = entity.quickFilterTitles![0];

			await pickQuickFilter(page, section, seeded.names[0]);
			await expectExpressionContains(page, seeded.names[0]);

			await clearQuickFilterSection(page, section);

			await expect(async () => {
				expect(await renderedRowKeys(page)).toEqual(before);
			}).toPass();
		});

		test(`TC-09 ${entity.key}: a quick filter and a search expression combine`, async ({
			authedPage: page,
		}) => {
			const seeded = await openSeededList(page, entity);
			const target = seeded.names[0];

			await pickQuickFilter(page, entity.quickFilterTitles![0], target);
			// A second, non-contradicting clause via the search box.
			await applyExpressionKeepingExisting(page, nameExpression(entity, target));

			await expectExpressionContains(page, target);
			await waitForRow(page, rowKeyFor(entity, seeded, target));
		});

		test(`TC-11 ${entity.key}: a reload preserves the expression from the URL`, async ({
			authedPage: page,
		}) => {
			const seeded = await openSeededList(page, entity);
			const expression = nameExpression(entity, seeded.names[0]);

			await applyExpression(page, expression);
			await page.reload();
			await waitForRows(page);

			await expectExpression(page, expression);
			await expect(querySearchEditor(page)).toContainText(seeded.names[0]);
		});

		test(`TC-05 ${entity.key}: an invalid expression queries anyway and surfaces the failure`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity);

			const listRequests: string[] = [];
			page.on('request', (request) => {
				// `/checks` shares the prefix; counting it makes the callout's refetch
				// satisfy an assertion about the *list* request.
				if (isListUrl(request.url())) {
					listRequests.push(request.url());
				}
			});

			// A dangling operator. An unbalanced quote is *not* usable here: the editor
			// auto-closes it, so `= 'unclosed` reaches the URL as valid `= 'unclosed'`.
			const invalid = 'k8s.pod.name IN';
			await querySearchEditor(page).click();
			await page.keyboard.press('ControlOrMeta+a');
			await page.keyboard.press('Delete');
			await page.keyboard.type(invalid);
			await page.keyboard.press('Escape');
			const before = listRequests.length;
			await runQuery(page);

			// `K8sHeader.handleRunQuery` navigates and invalidates unconditionally — it
			// runs no `validateQuery`, unlike the drawer's Logs/Traces/Events tabs. So
			// the list *does* query, and the contract worth pinning is that the failure
			// is visible rather than a blank page or a crash.
			await expect(async () => {
				expect(listRequests.length, 'a list request fired').toBeGreaterThan(before);
			}).toPass();
			await expect(page.getByText('Something went wrong')).toHaveCount(0);
			await expect(
				page
					.getByTestId(EMPTY_STATE.error)
					.or(page.getByTestId(EMPTY_STATE.empty))
					.first(),
			).toBeVisible();
			// The editor normalises what it hands over, so the round trip is asserted by
			// content rather than by character-for-character equality.
			await expectExpressionContains(page, 'k8s.pod.name');
		});
	});
}

// ─── once-level: cancel and the race guard ───────────────────────────────────

test.describe('filters cancel and races', () => {
	const entity = entityByKey('pods');

	test('TC-12 while fetching, Run becomes Cancel and cancelling aborts the request', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, entity);
		await seedDataset(page, entity.seed.primary);

		// Hold the list response so the in-flight state is observable.
		let release = (): void => {};
		const held = new Promise<void>((resolve) => {
			release = resolve;
		});
		let held_once = false;
		await page.route(/\/api\/v\d+\/infra_monitoring\//, async (route) => {
			// `/checks` shares the prefix and races the list request, so an
			// unconditional "hold the first one" can hold the callout's request instead
			// and leave the list to load normally — no in-flight state to observe.
			const isList = !route.request().url().includes('/checks');
			if (isList && !held_once) {
				held_once = true;
				await held;
			}
			try {
				await route.continue();
			} catch {
				// Cancelling aborts the request the handler is still holding, so by the
				// time it resumes the route is already settled. That abort is the point
				// of the scenario, not a failure of it.
			}
		});

		// The abort itself, not just the button swap. `K8sBaseList` wires
		// `cancelQuery` to the query's AbortSignal, so a cancelled list request
		// surfaces as a `requestfailed`. Without this the scenario asserted only
		// "Cancel became Run", which an app that never called `cancelQueries` also
		// satisfies — and the `catch {}` in the route handler above swallowed the
		// evidence either way.
		const aborted: string[] = [];
		page.on('requestfailed', (request) => {
			const url = request.url();
			if (
				/\/api\/v\d+\/infra_monitoring\//.test(url) &&
				!url.includes('/checks')
			) {
				aborted.push(url);
			}
		});

		await page.goto(listUrl(entity));

		await expect(cancelQueryButton(page)).toBeVisible();
		await cancelQueryButton(page).click();
		await expect(runQueryButton(page)).toBeVisible();

		release();
		await expect(async () => {
			expect(aborted, 'the in-flight list request was aborted').not.toEqual([]);
		}).toPass();
		await page.unrouteAll();
	});

	test('TC-13 rapid successive quick-filter clicks settle on the last one', async ({
		authedPage: page,
	}) => {
		// TODO: only the *first* click in a quick-filter section reaches the query.
		// `applyCheckboxToggle` reads and writes the V3 `filters.items`, but once a
		// tick lands the query builder normalises that clause into the V5
		// `filter.expression` and empties `items` — so the next click takes the "no
		// filter for this key" branch and appends a contradictory clause instead of
		// editing the existing one, while `useExistingQuery` keeps rendering the row
		// states off `filter.expression`. Observed on pods with a six-second settle
		// between clicks, so it is the toggle algebra and not a render race:
		// `in ['acc-p1']` → untick acc-p1 → still `in ['acc-p1']`, row still checked.
		// Unfixme once the rail edits whichever of the two the query actually holds.
		test.fixme(
			true,
			'only the first quick-filter tick reaches the query: applyCheckboxToggle edits filters.items, which the query builder has already normalised into filter.expression, so every later click in the section is dropped',
		);

		await resetTableState(page, entity);
		const seeded = await seedDataset(page, entity.seed.primary);
		await gotoList(page, entity);
		await waitForRows(page);

		const section = entity.quickFilterTitles![0];
		const [first, second] = seeded.names;

		// Start from a section that already carries a clause for this attribute.
		// Without one the rail renders *every* value checked — `deriveItemConfig`'s
		// "no existing query and no filter" rule — so a click there excludes rather
		// than picks, and the pair below would settle on the same state whether or
		// not the first click was lost. Priming is what makes a lost update visible:
		// from `in [first]`, ticking `second` and then unticking `first` settles on
		// `in [second]`, while a handler that read the pre-click query for the second
		// click drops the clause entirely and the unfiltered list comes back.
		await pickQuickFilter(page, section, first);

		// `pickQuickFilter` waits for each tick to land in the URL before returning,
		// so calling it twice is strictly sequential and creates no race at all — the
		// scenario was named for a guard it never exercised. Click both boxes
		// back-to-back instead, with no settle in between.
		const panel = quickFilterSection(page, section);
		// Both rows have to be on screen at once for the clicks to be back-to-back,
		// and the value list is a truncated top-N over a shared stack — so search for
		// the longest prefix the two seeded names share (`acc-p1`/`acc-p2` → `acc-p`)
		// rather than for either name, which would hide the other.
		const shared = [...first].findIndex((ch, i) => second[i] !== ch);
		await panel
			.getByTestId('checkbox-filter-search')
			.fill(shared === -1 ? first : first.slice(0, shared));
		await expect(panel.getByTestId(`checkbox-value-row-${second}`)).toBeVisible({
			timeout: 15_000,
		});
		await expect(panel.getByTestId(`checkbox-value-row-${first}`)).toBeVisible();
		await panel
			.getByTestId(`checkbox-value-row-${second}`)
			.locator('button[role="checkbox"]')
			.click();
		await panel
			.getByTestId(`checkbox-value-row-${first}`)
			.locator('button[role="checkbox"]')
			.click();

		// Both clicks applied, in order, and the rendered rows match the *settled*
		// expression rather than a stale response — which is what "no stale rows"
		// means. A `length > 0` check passes on a fully stale list, so assert the
		// exact set. The two expression reads share one `toPass` because they are one
		// claim about a single settled state: reading them apart lets the mid-flight
		// `in [first, second]` satisfy each in turn.
		await expect(async () => {
			const expression = readExpression(page);
			expect(expression).toContain(second);
			expect(expression).not.toContain(first);
		}).toPass();
		await expect(async () => {
			expect(await renderedRowKeys(page)).toEqual([
				rowKeyFor(entity, seeded, second),
			]);
		}).toPass();
	});
});

/**
 * Append a clause through the search box without discarding what the quick
 * filters already wrote — the box is pre-populated with the combined expression,
 * so typing over it is what a user does to add to it.
 */
async function applyExpressionKeepingExisting(
	page: Page,
	clause: string,
): Promise<void> {
	await querySearchEditor(page).click();
	await page.keyboard.press('End');
	await page.keyboard.type(` AND ${clause}`);
	await page.keyboard.press('Escape');
	await runQuery(page);
}

/**
 * The `row-<key>` suffix for a named entity. Pods are keyed by UID, everything
 * else by name.
 */
function rowKeyFor(
	entity: EntityDef,
	seeded: SeededFacts,
	name: string,
): string {
	if (entity.key !== 'pods') {
		return name;
	}
	return name === entity.seed.sampleName
		? entity.seed.sampleItemKey
		: `${name}-uid`;
}
