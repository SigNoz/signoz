import {
	getSavedView,
	listSavedViews,
} from 'api/generated/services/saved-view';
import { SavedviewtypesSavedViewDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { SavedViewSourcePage } from 'container/SavedViews/types';
import { findSavedView } from 'container/SavedViews/utils/findSavedView';
import { getSavedViewQuery } from 'container/SavedViews/utils/getSavedViewQuery';
import { toSavedViewSource } from 'container/SavedViews/utils/toSavedViewSource';
import { SOURCEPAGE_VS_ROUTES } from 'container/SavedViews/constants';
import { navigate } from 'lib/router/navigation';
import { DataSource } from 'types/common/queryBuilder';
import { buildExplorerNavigationUrl } from 'utils/buildExplorerNavigationUrl';

type SavedViewSourceHint = SavedViewSourcePage;

const DEFAULT_PROBE_SOURCES: SavedViewSourceHint[] = [
	DataSource.LOGS,
	DataSource.TRACES,
	DataSource.METRICS,
];

export async function findSavedViewInLists(
	viewKey: string,
	sourceHint?: SavedViewSourceHint | null,
): Promise<SavedviewtypesSavedViewDTO | null> {
	const sources = sourceHint ? [sourceHint] : DEFAULT_PROBE_SOURCES;

	for (const source of sources) {
		try {
			const response = await listSavedViews({
				source: toSavedViewSource(source),
			});
			const match = findSavedView(response.data, viewKey);
			if (match) {
				return match;
			}
		} catch {
			// Probe the next source page when no entity hint is provided.
		}
	}

	return null;
}

async function loadSavedView(
	viewKey: string,
	sourceHint?: SavedViewSourceHint | null,
): Promise<SavedviewtypesSavedViewDTO> {
	try {
		const response = await getSavedView({ id: viewKey });
		if (response.data) {
			return response.data;
		}
	} catch {
		// Fall back to list probing when the direct lookup fails.
	}

	const fromList = await findSavedViewInLists(viewKey, sourceHint);
	if (fromList) {
		return fromList;
	}

	throw new Error('Saved view not found');
}

export function explorerRouteForSourcePage(
	sourcePage: DataSource | string,
): (typeof SOURCEPAGE_VS_ROUTES)[keyof typeof SOURCEPAGE_VS_ROUTES] | null {
	return SOURCEPAGE_VS_ROUTES[sourcePage] ?? null;
}

export function openSavedView(view: SavedviewtypesSavedViewDTO): void {
	const route = view.source ? explorerRouteForSourcePage(view.source) : null;
	if (!route) {
		throw new Error('Unsupported saved view source');
	}

	if (!view.spec.queries?.length) {
		throw new Error('Saved view is missing query data');
	}

	const query = getSavedViewQuery(view);
	const url = buildExplorerNavigationUrl(route, query, {
		[QueryParams.panelTypes]: view.spec.panelType as unknown as PANEL_TYPES,
		[QueryParams.viewKey]: view.id,
	});
	navigate(url);
}

export async function openSavedViewByKey(
	viewKey: string,
	sourceHint: SavedViewSourceHint | null | undefined,
): Promise<void> {
	const view = await loadSavedView(viewKey, sourceHint);
	openSavedView(view);
}
