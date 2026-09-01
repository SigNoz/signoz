import {
	DashboardtypesPanelBackgroundDTO,
	type DashboardtypesPanelSpecDTO,
	type DashboardtypesTextPresentationDTO,
} from 'api/generated/services/sigNoz.schemas';

/**
 * Whether the panel opted out of its card chrome (TDD D7). The card is an
 * ancestor of the renderer, so hosts read this one plugin-spec field — the
 * accepted smell; the union can't be narrowed by a dynamic kind, hence one
 * localized cast for every host.
 */
export function isTransparentPanel(spec: DashboardtypesPanelSpecDTO): boolean {
	const presentation = (spec.plugin.spec as {
		presentation?: DashboardtypesTextPresentationDTO;
	}).presentation;
	return (
		presentation?.background === DashboardtypesPanelBackgroundDTO.transparent
	);
}
