import type { DashboardLinkDTO } from 'api/generated/services/sigNoz.schemas';
import { processContextLinks } from 'container/NewWidget/RightContainer/ContextLinks/utils';
import type { ContextLinkProps } from 'types/api/dashboard/getAll';

/** A panel context link with its label and URL templates resolved, ready to render. */
export interface ResolvedDrilldownLink {
	id: string;
	label: string;
	url: string;
}

/**
 * Resolves a panel's context links for the drilldown menu. Adapts each `DashboardLinkDTO` to the V1
 * `ContextLinkProps` the shared `processContextLinks` resolver expects, substitutes variables in the
 * label + URL, and drops links without a URL. Links with `renderVariables === false` keep their raw
 * label/URL (no substitution).
 */
export function resolvePanelContextLinks(
	links: DashboardLinkDTO[] | undefined,
	processedVariables: Record<string, string>,
): ResolvedDrilldownLink[] {
	const usable = (links ?? []).filter((link) => !!link.url);
	if (usable.length === 0) {
		return [];
	}

	const adapted: ContextLinkProps[] = usable.map((link, index) => ({
		id: String(index),
		label: link.name || link.url || '',
		url: link.url ?? '',
	}));

	const resolved = processContextLinks(adapted, processedVariables, 50);

	return usable.map((link, index) => {
		// `renderVariables` defaults to on; only an explicit `false` opts out of substitution.
		if (link.renderVariables === false) {
			return {
				id: String(index),
				label: link.name || link.url || '',
				url: link.url ?? '',
			};
		}
		return {
			id: resolved[index].id,
			label: resolved[index].label,
			url: resolved[index].url,
		};
	});
}
