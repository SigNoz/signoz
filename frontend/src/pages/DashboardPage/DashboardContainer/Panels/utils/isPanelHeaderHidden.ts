import type {
	DashboardtypesHeaderOptionsDTO,
	DashboardtypesPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';

/**
 * Whether the panel opted out of its header strip (`headerOptions.hide`) —
 * one localized cast over the plugin-spec union, as `isTransparentPanel`.
 */
export function isPanelHeaderHidden(spec: DashboardtypesPanelSpecDTO): boolean {
	const headerOptions = (
		spec.plugin.spec as {
			headerOptions?: DashboardtypesHeaderOptionsDTO;
		}
	).headerOptions;
	return headerOptions?.hide === true;
}
