import { expect, EXPLORER, test } from '../../drivers/query-builder';

// Typing is real keystrokes: the regressions here (caret jumps, swallowed
// Enter, the run shortcut) only show up through the keyboard path.

const COMPOUND: Record<string, string> = {
	'NOT over a parenthesised OR':
		"NOT (severity_text = 'INFO' OR severity_text = 'WARN') AND service.name = 'frontend'",
	'nested groups':
		"(service.name = 'frontend' AND (severity_text = 'ERROR' OR severity_text = 'WARN'))",
	'NOT IN with EXISTS':
		"service.name NOT IN ['frontend', 'adservice'] AND logger.name EXISTS",
};

const queryWithFilter = (expression: string): unknown => ({
	queryType: 'builder',
	builder: {
		queryFormulas: [],
		queryData: [
			{
				queryName: 'A',
				dataSource: 'logs',
				expression: 'A',
				filter: { expression },
				aggregations: [{ expression: 'count()' }],
			},
		],
	},
});

const VERBATIM: Record<string, string> = {
	'an escaped quote': "logger.name = 'it\\'s'",
	'a double-quoted string': 'logger.name = "double quoted"',
	'a quoted numeric string': "logger.name = '123'",
	'a bare number': 'logger.name = 123',
	'a boolean': 'logger.name = true',
	'spaces and a backslash': "logger.name = 'a b\\\\c'",
};

test.describe('Query builder — filter editor', () => {
	test('TC-07 key, operator and value suggestions build the expression', async ({
		qb,
	}) => {
		await qb.openExplorer(EXPLORER.logs);
		const filter = qb.query('A').filter;

		await filter.type('severity_te');
		await filter.suggestion('severity_text').first().click();
		await expect.poll(() => filter.expression()).toMatch(/^severity_text\s*$/);

		await expect(filter.suggestion(/^=/).first()).toBeVisible();
		await filter.append('= ');
		await filter.suggestion('ERROR').first().click();
		await expect
			.poll(() => filter.expression())
			.toMatch(/^severity_text = 'ERROR'\s*$/);

		const fired = await qb.run();
		expect(qb.spec(fired, 'A').filter?.expression?.trim()).toBe(
			"severity_text = 'ERROR'",
		);
	});

	for (const [label, expression] of Object.entries(VERBATIM)) {
		test(`TC-08 ${label} is sent and restored verbatim`, async ({
			authedPage: page,
			qb,
		}) => {
			await qb.openExplorer(EXPLORER.logs);
			const filter = qb.query('A').filter;

			await filter.type(expression);
			await filter.press('Escape');
			const fired = await qb.run();
			expect(qb.spec(fired, 'A').filter?.expression).toBe(expression);

			await page.reload();
			await expect(filter.content()).toBeVisible();
			await expect.poll(() => filter.expression()).toBe(expression);
			await expect(qb.query('A').filterStatus()).toHaveCount(0);
		});
	}

	test('TC-11 the status icon shows only for an unfocused invalid filter', async ({
		qb,
	}) => {
		await qb.openExplorer(EXPLORER.logs);
		const query = qb.query('A');

		await query.filter.type('service.name =');
		await expect(query.filterStatus()).toHaveCount(0);

		await query.filter.content().blur();
		await expect(query.filterStatus()).toBeVisible();

		await query.filter.type("service.name = 'frontend'");
		await query.filter.content().blur();
		await expect(query.filterStatus()).toHaveCount(0);

		await query.filter.clear();
		await query.filter.content().blur();
		await expect(query.filterStatus()).toHaveCount(0);
	});

	test('TC-12 Enter and Shift+Enter never insert a newline or run', async ({
		qb,
	}) => {
		await qb.openExplorer(EXPLORER.logs);
		const filter = qb.query('A').filter;
		await filter.type("severity_text = 'ERROR'");
		await filter.press('Escape');
		await expect(filter.suggestions()).toHaveCount(0);
		const sentBefore = qb.sent().length;

		await filter.press('Enter');
		await filter.press('Shift+Enter');

		await expect(filter.lineCount()).toHaveCount(1);
		await expect.poll(() => filter.expression()).toBe("severity_text = 'ERROR'");
		expect(qb.sent()).toHaveLength(sentBefore);
	});

	for (const explorer of ['logs', 'traces'] as const) {
		test(`TC-13 Cmd/Ctrl+Enter in the ${explorer} filter runs the edited query`, async ({
			qb,
		}) => {
			await qb.openExplorer(EXPLORER[explorer]);
			const filter = qb.query('A').filter;
			await filter.type("service.name = 'frontend'");

			const fired = await qb.runShortcut();

			expect(qb.spec(fired, 'A').filter?.expression).toBe(
				"service.name = 'frontend'",
			);
			await expect(filter.lineCount()).toHaveCount(1);
			expect(qb.urlQuery()).toMatchObject({ queryType: 'builder' });
		});
	}

	test('TC-14 Escape closes suggestions and keeps the text', async ({ qb }) => {
		await qb.openExplorer(EXPLORER.logs);
		const filter = qb.query('A').filter;

		await filter.type('serv');
		await filter.openSuggestions();
		await filter.press('Escape');

		await expect(filter.suggestions()).toHaveCount(0);
		await expect.poll(() => filter.expression()).toBe('serv');
		await filter.press('i');
		await expect.poll(() => filter.expression()).toBe('servi');

		await filter.press('Escape');
		await filter.press('Escape');
		await expect.poll(() => filter.expression()).toBe('servi');
		await expect(filter.content()).toBeFocused();
	});

	test('TC-09 value suggestions fill an IN list', async ({ qb }) => {
		await qb.openExplorer(EXPLORER.logs);
		const filter = qb.query('A').filter;

		await filter.type('service.name IN ');
		await filter.suggestion('frontend').first().click();
		await expect
			.poll(() => filter.expression())
			.toBe("service.name IN ['frontend'] ");

		await filter.type("service.name IN ['frontend', 'cartservice']");
		await filter.press('Escape');
		const fired = await qb.run();

		expect(qb.spec(fired, 'A').filter?.expression).toBe(
			"service.name IN ['frontend', 'cartservice']",
		);
		await expect(qb.query('A').filterStatus()).toHaveCount(0);
	});

	for (const [label, expression] of Object.entries(COMPOUND)) {
		test(`TC-10 ${label} is valid and sent verbatim`, async ({ qb }) => {
			await qb.openExplorer(EXPLORER.logs);
			const query = qb.query('A');

			await query.filter.type(expression);
			await query.filter.press('Escape');
			await query.filter.content().blur();
			await expect(query.filterStatus()).toHaveCount(0);
			const fired = await qb.run();

			expect(qb.spec(fired, 'A').filter?.expression).toBe(expression);
		});
	}

	test('TC-15 an expression with CRLF from the URL loads without a RangeError', async ({
		qb,
	}) => {
		await qb.openExplorer(EXPLORER.logs, {
			query: queryWithFilter("body CONTAINS 'line1\r\nline2'"),
		});

		await expect.poll(() => qb.query('A').filter.expression()).toContain('line1');
		expect(qb.console.errors.filter((e) => e.includes('RangeError'))).toEqual([]);
		await qb.query('A').filter.append(" AND severity_text = 'ERROR'");
		await expect
			.poll(() => qb.query('A').filter.expression())
			.toMatch(/severity_text = 'ERROR'$/);
		expect(qb.console.errors).toEqual([]);
	});

	test('TC-16 a quick-filter value toggles between excluded and cleared', async ({
		qb,
	}) => {
		await qb.openExplorer(EXPLORER.logs);
		const filter = qb.query('A').filter;
		const handTyped = "service.name = 'frontend'";
		const excluded = `${handTyped} severity_text not in ['ERROR']`;
		const error = qb.quickFilter('Severity Text', 'ERROR');
		await filter.type(handTyped);
		await qb.run();

		for (const expected of [excluded, handTyped, excluded]) {
			const fired = await error.toggle();

			expect(qb.spec(fired, 'A').filter?.expression).toBe(expected);
			await expect.poll(() => filter.expression()).toBe(expected);
		}
		await expect(error.checkbox()).toHaveAttribute('aria-checked', 'false');
	});
});
