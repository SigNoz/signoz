import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { isQuerylessPanelKind } from 'pages/DashboardPage/DashboardContainer/Panels/capabilities';

/**
 * The markdown body of a static (query-less) panel, or null for query kinds.
 * One localized cast: the plugin-spec union can't be narrowed by a dynamic kind.
 */
export function getTextPanelBody(
	spec: DashboardtypesPanelSpecDTO | undefined,
): string | null {
	if (!spec?.plugin || !isQuerylessPanelKind(spec.plugin.kind)) {
		return null;
	}
	const { text } = spec.plugin.spec as { text?: string };
	return typeof text === 'string' ? text : null;
}
