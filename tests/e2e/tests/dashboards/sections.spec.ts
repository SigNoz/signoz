import { expect, test } from '../../drivers/dashboards';

// The section actions menu on a v2 dashboard. The JSON-patch ops each action
// builds are covered by jest under `Section/hooks/__tests__/`; here each one has
// to reach the stored dashboard.

const titlesOf = (layouts: { spec: { display?: { title?: string } } }[]) =>
	layouts.map((layout) => layout.spec.display?.title ?? '');

test.describe('Dashboard sections', () => {
	test('TC-01 renaming a section persists its new title', async ({
		dashboards,
	}) => {
		const seed = await dashboards.create(
			`e2e-dash-sec-rename-${Date.now()}`,
			[],
			[{ title: 'Before', panels: ['p1'] }],
		);

		try {
			await dashboards.goto(seed.id);
			await dashboards.openSectionMenu('Before');
			await dashboards.sectionAction('rename').click();
			await dashboards.submitSectionTitle('After');

			await expect(dashboards.section('After')).toBeVisible();
			await expect
				.poll(async () => titlesOf((await dashboards.fetch(seed.id)).spec.layouts))
				.toEqual(['After']);
		} finally {
			await dashboards.remove(seed.id);
		}
	});

	test('TC-02 cloning a section appends a copy with its own panels', async ({
		dashboards,
	}) => {
		const seed = await dashboards.create(
			`e2e-dash-sec-clone-${Date.now()}`,
			[],
			[{ title: 'Origin', panels: ['p1'] }],
		);

		try {
			await dashboards.goto(seed.id);
			await dashboards.openSectionMenu('Origin');
			await dashboards.sectionAction('clone-section').click();

			await expect(dashboards.section('Origin (Copy)')).toBeVisible();
			await expect
				.poll(async () => {
					const stored = await dashboards.fetch(seed.id);
					return {
						titles: titlesOf(stored.spec.layouts),
						panels: Object.keys(stored.spec.panels).length,
					};
				})
				.toEqual({ titles: ['Origin', 'Origin (Copy)'], panels: 2 });
		} finally {
			await dashboards.remove(seed.id);
		}
	});

	test('TC-03 deleting a section removes it and its panels', async ({
		dashboards,
	}) => {
		const seed = await dashboards.create(
			`e2e-dash-sec-delete-${Date.now()}`,
			[],
			[
				{ title: 'Keep', panels: ['p1'] },
				{ title: 'Drop', panels: ['p2'] },
			],
		);

		try {
			await dashboards.goto(seed.id);
			await dashboards.openSectionMenu('Drop');
			await dashboards.sectionAction('delete-section').click();
			await dashboards.confirmDelete();

			await expect(dashboards.section('Drop')).toHaveCount(0);
			await expect
				.poll(async () => {
					const stored = await dashboards.fetch(seed.id);
					return {
						titles: titlesOf(stored.spec.layouts),
						panels: Object.keys(stored.spec.panels),
					};
				})
				.toEqual({ titles: ['Keep'], panels: ['p1'] });
		} finally {
			await dashboards.remove(seed.id);
		}
	});
});
