import type {
	DashboardtypesPanelSpecDTO,
	DashboardtypesTextPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';

/**
 * The spec with a new authored body. Two localized casts: the plugin-spec union
 * can't be narrowed by a dynamic kind, and a bare literal resolves against the
 * wrong arm of `plugin` on the way back in.
 */
export function withPanelText(
	spec: DashboardtypesPanelSpecDTO,
	text: string,
): DashboardtypesPanelSpecDTO {
	const pluginSpec: DashboardtypesTextPanelSpecDTO = {
		...(spec.plugin.spec as DashboardtypesTextPanelSpecDTO),
		text,
	};
	return {
		...spec,
		plugin: {
			...spec.plugin,
			spec: pluginSpec,
		} as DashboardtypesPanelSpecDTO['plugin'],
	};
}
