import {
	CONTROL_WRITES,
	DEFAULT_CONTROLS,
	isControlVisible,
	resolveControls,
} from '../dashboardControls';
import type { DashboardControlId } from '../types';

const ALL_IDS = Object.keys(CONTROL_WRITES) as DashboardControlId[];

describe('resolveControls', () => {
	it('shows every control when the host passes nothing', () => {
		expect(resolveControls(undefined, false)).toStrictEqual(DEFAULT_CONTROLS);
	});

	it('hides a whole group from one boolean', () => {
		const controls = resolveControls({ header: false }, false);

		expect(controls.header).toStrictEqual({
			breadcrumbs: false,
			share: false,
			feedback: false,
		});
		expect(controls.title.name).toBe(true);
	});

	it('hides single items and keeps the rest of the group', () => {
		const controls = resolveControls(
			{ panelActions: { createAlert: false } },
			false,
		);

		expect(controls.panelActions.createAlert).toBe(false);
		expect(controls.panelActions.download).toBe(true);
	});

	it('hides every writing control on a read-only mount, whatever the host asked', () => {
		const controls = resolveControls(
			{ dashboardActions: true, panelActions: { edit: true } },
			true,
		);

		ALL_IDS.forEach((id) => {
			expect([id, isControlVisible(controls, id)]).toStrictEqual([
				id,
				!CONTROL_WRITES[id],
			]);
		});
	});

	it('still lets the host hide non-writing controls on a read-only mount', () => {
		const controls = resolveControls({ panelActions: { download: false } }, true);

		expect(controls.panelActions.download).toBe(false);
		expect(controls.panelActions.view).toBe(true);
	});
});
