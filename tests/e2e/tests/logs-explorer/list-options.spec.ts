import { expect, lineBody, serviceFilter, test } from '../../drivers/logs';

test.describe('Logs Explorer — list options', () => {
	test('TC-01 an added column shows seeded values and survives a reload', async ({
		logs,
		logsSeed,
	}) => {
		await logs.gotoUntil(logsSeed.recent[0], {
			expression: serviceFilter(logsSeed.service),
		});
		await logs.setFormat('Column');

		await logs.openColumns();
		await logs.addColumn('e2e.kind');

		await expect
			.poll(() => logs.table.headers())
			.toEqual(expect.arrayContaining(['e2e.kind']));
		await expect(logs.rowByBody(lineBody(logsSeed.marker, 23))).toContainText(
			'odd',
		);

		await logs.reload();
		await expect
			.poll(() => logs.table.headers())
			.toEqual(expect.arrayContaining(['e2e.kind']));
	});

	test('TC-02 Download exports the filtered rows as CSV', async ({
		logs,
		logsSeed,
	}) => {
		await logs.gotoUntil(logsSeed.recent[0], {
			expression: serviceFilter(logsSeed.service),
		});

		const file = await logs.download('csv');

		expect(file.name).toMatch(/\.csv$/);
		expect(file.text).toContain(logsSeed.recent[0]);
		const rows = file.text
			.split('\n')
			.slice(1)
			.filter((line) => line.trim() !== '');
		expect(rows).toHaveLength(logsSeed.total);
		expect(rows.filter((line) => !line.includes(logsSeed.marker))).toEqual([]);
	});
});
