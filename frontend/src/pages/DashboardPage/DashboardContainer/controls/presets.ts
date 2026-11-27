import { DEFAULT_CONTROLS } from './dashboardControls';
import type {
	DashboardControlGroup,
	DashboardControls,
	DashboardControlsInput,
} from './types';

/**
 * The host page owns the header, the title row and the dashboard-level actions.
 * Layout presets only: `readOnly` stays a separate switch, so no preset can turn
 * a writing control back on.
 */
export const EMBEDDED: DashboardControlsInput = {
	header: false,
	title: false,
	dashboardActions: false,
};

/** Embedded, and panels are just charts: no panel menu, no drilldown. Charts still zoom. */
export const CHARTS_ONLY: DashboardControlsInput = {
	...EMBEDDED,
	panelActions: {
		view: false,
		edit: false,
		clone: false,
		download: false,
		createAlert: false,
		move: false,
		delete: false,
		drilldown: false,
	},
};

type GroupInput<G extends DashboardControlGroup> =
	| boolean
	| Partial<DashboardControls[G]>;

function mergeGroup<G extends DashboardControlGroup>(
	group: G,
	base: GroupInput<G> | undefined,
	next: GroupInput<G> | undefined,
): GroupInput<G> | undefined {
	if (next === undefined) {
		return base;
	}
	if (typeof next === 'boolean' || base === undefined) {
		return next;
	}
	// A whole-group boolean underneath expands to its items before the override.
	const expanded: Partial<DashboardControls[G]> =
		typeof base === 'boolean'
			? (Object.fromEntries(
					Object.keys(DEFAULT_CONTROLS[group]).map((item) => [item, base]),
				) as Partial<DashboardControls[G]>)
			: base;
	return { ...expanded, ...next };
}

/** Merges presets and overrides; later inputs win, item by item. */
export function withControls(
	...inputs: DashboardControlsInput[]
): DashboardControlsInput {
	const groups = Object.keys(DEFAULT_CONTROLS) as DashboardControlGroup[];
	return inputs.reduce<DashboardControlsInput>((merged, input) => {
		const result: DashboardControlsInput = { ...merged };
		groups.forEach((group) => {
			const value = mergeGroup(group, merged[group], input[group]);
			if (value !== undefined) {
				(result as Record<string, unknown>)[group] = value;
			}
		});
		return result;
	}, {});
}
