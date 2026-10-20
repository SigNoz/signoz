import { expect, test } from '../../drivers/dashboards';

// What a viewer is offered on a dashboard someone else can edit. The gating
// logic is covered by jest (`*.authz.test.tsx`); this checks the real authz
// endpoint denies a real viewer and the menus carry its reason.

const DENIED = /is not authorized to perform/;

test.describe('Dashboard details as a viewer', () => {
	test.describe.configure({ timeout: 60_000 });

	test.use({ as: 'viewer' });

	test('TC-01 the toolbar Actions rows that write are disabled with a reason', async ({
		dashboards,
	}) => {
		const seed = await dashboards.asAdmin((admin) =>
			admin.create(
				`e2e-dash-viewer-actions-${Date.now()}`,
				[],
				[{ panels: ['p1'] }],
			),
		);

		try {
			await dashboards.goto(seed.id);
			await dashboards.optionsButton().click();

			// A row still checking its permission is aria-disabled too, so the
			// denial is proven by the reason, not by the attribute alone.
			for (const value of ['rename', 'clone', 'lock', 'new-section', 'delete']) {
				const row = dashboards.action(value);
				await expect(row).toHaveAttribute('aria-disabled', 'true');
				await expect(await dashboards.hoverReason(row)).toHaveText(DENIED);
			}
			await expect(dashboards.action('fullscreen')).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);
		} finally {
			await dashboards.asAdmin((admin) => admin.remove(seed.id));
		}
	});

	test('TC-02 the panel menu disables Edit and Delete with a reason, and View still opens', async ({
		dashboards,
	}) => {
		const seed = await dashboards.asAdmin((admin) =>
			admin.create(
				`e2e-dash-viewer-panel-${Date.now()}`,
				[],
				[{ panels: ['p1'] }],
			),
		);

		try {
			await dashboards.goto(seed.id);
			await dashboards.openPanelMenu('p1');

			const edit = dashboards.panelMenuItem('p1', 'edit-panel');
			const remove = dashboards.panelMenuItem('p1', 'delete-panel');
			await expect(edit).toHaveAttribute('aria-disabled', 'true');
			await expect(remove).toHaveAttribute('aria-disabled', 'true');
			await expect(await dashboards.hoverReason(edit)).toHaveText(DENIED);
			await expect(await dashboards.hoverReason(remove)).toHaveText(DENIED);

			await dashboards.panelMenuItem('p1', 'view-panel').click();
			await expect(dashboards.viewPanelModal()).toBeVisible();
		} finally {
			await dashboards.asAdmin((admin) => admin.remove(seed.id));
		}
	});
});
