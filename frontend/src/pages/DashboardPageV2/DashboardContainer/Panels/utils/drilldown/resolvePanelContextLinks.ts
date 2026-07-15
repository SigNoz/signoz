import type { DashboardLinkDTO } from 'api/generated/services/sigNoz.schemas';
import { resolveTexts } from 'hooks/dashboard/useContextVariables';

import { resolveContextLinkUrl } from './resolveContextLinkUrl';

/** A panel context link with its label and URL templates resolved, ready to render. */
export interface ResolvedDrilldownLink {
	id: string;
	label: string;
	url: string;
}

/**
 * Resolves a panel's context links for the drilldown menu: substitutes variables in each link's
 * label + URL, drops links without a URL, and skips substitution when `renderVariables === false`.
 */
export function resolvePanelContextLinks(
	links: DashboardLinkDTO[] | undefined,
	processedVariables: Record<string, string>,
): ResolvedDrilldownLink[] {
	const usable = (links ?? []).filter((link) => !!link.url);
	if (usable.length === 0) {
		return [];
	}

	return usable.map((link, index) => {
		const rawLabel = link.name || link.url || '';
		const rawUrl = link.url ?? '';
		// Only an explicit `false` opts out; undefined defaults to substitution on.
		if (link.renderVariables === false) {
			return { id: String(index), label: rawLabel, url: rawUrl };
		}
		return {
			id: String(index),
			label: resolveTexts({ texts: [rawLabel], processedVariables }).fullTexts[0],
			url: resolveContextLinkUrl(rawUrl, processedVariables),
		};
	});
}
