import type {
	DashboardControlGroup,
	DashboardControlId,
	DashboardControls,
	DashboardControlsInput,
} from './types';

export const DEFAULT_CONTROLS: DashboardControls = {
	header: { breadcrumbs: true, share: true, feedback: true },
	title: {
		name: true,
		description: true,
		tags: true,
		lock: true,
		publicBadge: true,
	},
	toolbar: {
		timeRange: true,
		autoRefresh: true,
		variables: true,
		addVariable: true,
	},
	actions: {
		fullscreen: true,
		rename: true,
		clone: true,
		lock: true,
		newSection: true,
		delete: true,
		configure: true,
		json: true,
		newPanel: true,
	},
	section: { addPanel: true, rename: true, clone: true, delete: true },
	panel: {
		view: true,
		edit: true,
		clone: true,
		download: true,
		createAlert: true,
		move: true,
		delete: true,
		drilldown: true,
	},
	viewModal: { switchToEdit: true },
};

/**
 * Whether each control writes to the dashboard. A read-only mount hides every
 * `true` here regardless of what the host asked for. Exhaustive, so a new
 * control can't ship without deciding.
 */
export const CONTROL_WRITES: Record<DashboardControlId, boolean> = {
	'header.breadcrumbs': false,
	'header.share': false,
	'header.feedback': false,
	'title.name': false,
	'title.description': false,
	'title.tags': false,
	'title.lock': true,
	'title.publicBadge': false,
	'toolbar.timeRange': false,
	'toolbar.autoRefresh': false,
	'toolbar.variables': false,
	'toolbar.addVariable': true,
	'actions.fullscreen': false,
	'actions.rename': true,
	'actions.clone': true,
	'actions.lock': true,
	'actions.newSection': true,
	'actions.delete': true,
	'actions.configure': true,
	// Opens read-only on a non-editable mount.
	'actions.json': false,
	'actions.newPanel': true,
	'section.addPanel': true,
	'section.rename': true,
	'section.clone': true,
	'section.delete': true,
	'panel.view': false,
	'panel.edit': true,
	'panel.clone': true,
	'panel.download': false,
	'panel.createAlert': false,
	'panel.move': true,
	'panel.delete': true,
	'panel.drilldown': false,
	'viewModal.switchToEdit': true,
};

function resolveGroup<G extends DashboardControlGroup>(
	group: G,
	input: DashboardControlsInput | undefined,
	readOnly: boolean,
): DashboardControls[G] {
	const defaults: Record<string, boolean> = DEFAULT_CONTROLS[group];
	const override = input?.[group] as
		| boolean
		| Partial<Record<string, boolean>>
		| undefined;
	const items = Object.keys(defaults).map((item): [string, boolean] => {
		const requested =
			typeof override === 'boolean'
				? override
				: (override?.[item] ?? defaults[item]);
		const writes = CONTROL_WRITES[`${group}.${item}` as DashboardControlId];
		return [item, requested && !(readOnly && writes)];
	});
	return Object.fromEntries(items) as DashboardControls[G];
}

/** Host input over the defaults, then every writing control off when read-only. */
export function resolveControls(
	input: DashboardControlsInput | undefined,
	readOnly: boolean,
): DashboardControls {
	return {
		header: resolveGroup('header', input, readOnly),
		title: resolveGroup('title', input, readOnly),
		toolbar: resolveGroup('toolbar', input, readOnly),
		actions: resolveGroup('actions', input, readOnly),
		section: resolveGroup('section', input, readOnly),
		panel: resolveGroup('panel', input, readOnly),
		viewModal: resolveGroup('viewModal', input, readOnly),
	};
}

export function isControlVisible(
	controls: DashboardControls,
	id: DashboardControlId,
): boolean {
	const [group, item] = id.split('.') as [DashboardControlGroup, string];
	return (controls[group] as Record<string, boolean>)[item];
}
