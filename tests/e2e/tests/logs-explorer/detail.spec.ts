import { expect, lineBody, serviceFilter, test } from '../../drivers/logs';

const KIND_FIELD = 'attributes.e2e.kind';

test.describe('Logs Explorer — detail drawer', () => {
	test('TC-01 the drawer shows the log body and its fields in pretty and JSON views', async ({
		logs,
		logsSeed,
		noise,
	}) => {
		await logs.gotoUntil(logsSeed.json, {
			expression: serviceFilter(logsSeed.service),
		});
		await logs.detail.open(logs.rowByBody(logsSeed.json).first());

		await expect(logs.detail.body()).toContainText(logsSeed.json);
		await expect(logs.detail.highlights()).toContainText(logsSeed.service);
		await expect(logs.detail.fieldActions(KIND_FIELD)).toBeVisible();
		// The JSON body is parsed into its own fields in the pretty view.
		await expect(logs.detail.fieldActions('body.user.id')).toBeVisible();

		await logs.detail.viewMode('JSON');
		await expect(logs.detail.drawer()).toContainText('e2e.kind');
		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-02 Filter for value from the drawer narrows the list', async ({
		logs,
		logsSeed,
	}) => {
		const odd = lineBody(logsSeed.marker, 23);
		await logs.gotoUntil(odd, { expression: serviceFilter(logsSeed.service) });
		await logs.detail.open(logs.rowByBody(odd));

		await logs.detail.fieldAction(KIND_FIELD, 'Filter for value');

		// The drawer action appends to `filters.items`; the URL expression keeps
		// its old text, so the editor is what shows the merged query.
		await expect(logs.search.editor()).toContainText("e2e.kind = 'odd'");
		await expect(logs.rowByBody(odd)).toBeVisible();
		await expect(logs.rowByBody(logsSeed.recent[0])).toHaveCount(0);
	});

	test('TC-03 Filter out value excludes it', async ({ logs, logsSeed }) => {
		const odd = lineBody(logsSeed.marker, 23);
		await logs.gotoUntil(odd, { expression: serviceFilter(logsSeed.service) });
		await logs.detail.open(logs.rowByBody(odd));

		await logs.detail.fieldAction(KIND_FIELD, 'Filter out value');

		await expect(logs.search.editor()).toContainText("e2e.kind != 'odd'");
		await expect(logs.rowByBody(odd)).toHaveCount(0);
		await expect(logs.rowByBody(logsSeed.recent[0])).toBeVisible();
	});

	test('TC-04 the context tab lists the neighbours of the selected log', async ({
		logs,
		logsSeed,
	}) => {
		const [before, selected, after] = [11, 12, 13].map((index) =>
			lineBody(logsSeed.marker, index),
		);
		await logs.gotoUntil(selected, {
			expression: serviceFilter(logsSeed.service),
		});
		await logs.detail.open(logs.rowByBody(selected));

		await logs.detail.tab('Context');

		const items = logs.detail.contextItems();
		await expect(items.filter({ hasText: before })).toBeVisible();
		await expect(items.filter({ hasText: after })).toBeVisible();
		const order = (await items.allInnerTexts()).flatMap((text) =>
			[before, selected, after].filter((body) => text.includes(body)),
		);
		expect(order).toHaveLength(3);
		expect(order[1]).toBe(selected);
		expect([order[0], order[2]].sort()).toEqual([after, before].sort());
	});

	test('TC-05 a copied row link reopens the same log', async ({
		logs,
		logsSeed,
	}) => {
		// Near the top: the Default list is virtualised and renders about a dozen rows.
		const target = lineBody(logsSeed.marker, 22);
		await logs.gotoUntil(target, { expression: serviceFilter(logsSeed.service) });
		await logs.setFormat('Default');

		const link = await logs.copyRowLink(logs.rowByBody(target));

		expect(new URL(link).searchParams.get('activeLogId')).toBeTruthy();
		const linked = await logs.openInNewTab(link);
		const row = logs.rowById(logs.activeLogId(linked), linked);
		await expect(row).toBeVisible();
		await expect(row).toContainText(target);
	});
});
