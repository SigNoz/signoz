import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import type { DashboardControlsInput } from 'pages/DashboardPage/DashboardContainer/controls/types';
import { resolveControls } from 'pages/DashboardPage/DashboardContainer/controls/dashboardControls';
import { render, screen } from 'tests/test-utils';

import BreakDown from '../BreakDown';
import {
	COST_METER_DASHBOARD,
	COST_METER_DASHBOARD_ID,
	SECTIONS,
} from '../dashboard';

jest.mock('pages/DashboardPage/DashboardContainer', () => ({
	__esModule: true,
	default: ({
		dashboard,
		readOnly,
		controls,
	}: {
		dashboard: DashboardtypesGettableDashboardV2DTO;
		readOnly: boolean;
		controls: DashboardControlsInput;
	}): JSX.Element => (
		<div
			data-testid="dashboard-container"
			data-dashboard-id={dashboard.id}
			data-read-only={String(readOnly)}
			data-controls={JSON.stringify(controls)}
		/>
	),
}));

describe('Cost meter breakdown', () => {
	it('mounts the assembled dashboard read-only as charts only, without auto-refresh', () => {
		render(<BreakDown />);

		const dashboard = screen.getByTestId('dashboard-container');
		expect(dashboard).toHaveAttribute(
			'data-dashboard-id',
			COST_METER_DASHBOARD_ID,
		);
		expect(dashboard).toHaveAttribute('data-read-only', 'true');
		const controls = resolveControls(
			JSON.parse(dashboard.getAttribute('data-controls') ?? ''),
			true,
		);
		expect(controls.header.breadcrumbs).toBe(false);
		expect(controls.panelActions.createAlert).toBe(false);
		expect(controls.panelActions.drilldown).toBe(false);
		expect(controls.panelActions.zoom).toBe(true);
		expect(controls.toolbar.autoRefresh).toBe(false);
		expect(controls.toolbar.timeRange).toBe(true);
	});

	it('keeps the UTC billing notice above the dashboard', () => {
		render(<BreakDown />);

		expect(screen.getByTestId('cost-meter-utc-notice')).toHaveTextContent(
			'Billing is calculated in UTC',
		);
	});

	it('places every panel exactly once, in its section', () => {
		const placed = COST_METER_DASHBOARD.spec.layouts.flatMap((layout) =>
			(layout.spec.items ?? []).map((item) =>
				item.content?.$ref?.replace('#/spec/panels/', ''),
			),
		);

		expect(placed.sort()).toStrictEqual(
			Object.keys(COST_METER_DASHBOARD.spec.panels).sort(),
		);
		expect(
			COST_METER_DASHBOARD.spec.layouts.map((l) => l.spec.display?.title),
		).toStrictEqual(SECTIONS.map((s) => s.title));
	});
});
