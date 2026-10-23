import {
	expect,
	PanelKind,
	Section,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../../drivers/panel-config';

test.describe('Dashboards V2 — Histogram panel', () => {
	test('TC-01 bucket count and width persist', async ({
		dashboards,
		editor,
		config,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Histogram }),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.buckets);
		await editor.control('bucket-count').fill('40');
		await editor.save();

		expect((await config.saved(id)).plugin).toMatchObject({
			histogramBuckets: { bucketCount: 40 },
		});
	});

	test('TC-02 merging active queries hides the Legend section', async ({
		dashboards,
		editor,
		config,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Histogram }),
			SINGLE_PANEL_ID,
		);

		// One merged distribution has no per-series legend to configure.
		await expect(editor.section.toggle(Section.legend)).toBeVisible();
		await editor.section.expand(Section.buckets);
		await editor.control('merge-queries').click();
		await expect(editor.section.toggle(Section.legend)).toHaveCount(0);

		await editor.save();
		expect((await config.saved(id)).plugin).toMatchObject({
			histogramBuckets: { mergeAllActiveQueries: true },
		});
	});
});
