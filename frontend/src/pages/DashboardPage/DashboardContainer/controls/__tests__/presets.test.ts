import { resolveControls } from '../dashboardControls';
import { CHARTS_ONLY, EMBEDDED, withControls } from '../presets';

describe('withControls', () => {
	it('adds an override group the preset leaves alone', () => {
		expect(
			withControls(EMBEDDED, { toolbar: { autoRefresh: false } }),
		).toStrictEqual({
			header: false,
			title: false,
			dashboardActions: false,
			toolbar: { autoRefresh: false },
		});
	});

	it('turns single items back on inside a group the preset hides', () => {
		const merged = withControls(CHARTS_ONLY, { panelActions: { view: true } });
		const controls = resolveControls(merged, false);

		expect(controls.panelActions.view).toBe(true);
		expect(controls.panelActions.download).toBe(false);
		expect(controls.panelActions.drilldown).toBe(false);
	});

	it('lets a later whole-group boolean replace earlier items', () => {
		expect(
			withControls(
				{ panelActions: { createAlert: false } },
				{ panelActions: true },
			),
		).toStrictEqual({ panelActions: true });
	});

	it('lets later items win over earlier ones', () => {
		expect(
			withControls(
				{ toolbar: { timeRange: false, autoRefresh: false } },
				{ toolbar: { timeRange: true } },
			),
		).toStrictEqual({ toolbar: { timeRange: true, autoRefresh: false } });
	});

	it('cannot turn a writing control back on for a read-only mount', () => {
		const merged = withControls(EMBEDDED, { dashboardActions: { delete: true } });

		expect(resolveControls(merged, true).dashboardActions.delete).toBe(false);
	});
});
