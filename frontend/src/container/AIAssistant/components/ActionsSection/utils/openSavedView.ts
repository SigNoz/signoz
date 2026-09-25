import {
	getSavedView,
	listSavedViews,
} from 'api/generated/services/saved-view';
import { SavedviewtypesSavedViewDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	findSavedView,
	getSavedViewQuery,
	SavedViewSourcePage,
	toSavedViewSource,
} from 'container/SavedViews/utils';
import { SOURCEPAGE_VS_ROUTES } from 'pages/SaveView/constants';
import { DataSource } from 'types/common/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { History } from 'history';

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

/**
 * Builds an explorer URL the same way `redirectWithQueryBuilderData` does —
 * without inheriting stale query params from the current page's `urlQuery`.
 */
export function buildExplorerNavigationUrl(
	route: string,
	query: Query,
	searchParams: Record<string, unknown>,
): string {
	const params = new URLSearchParams();
	params.set(
		QueryParams.compositeQuery,
		encodeURIComponent(JSON.stringify(query)),
	);
	Object.entries(searchParams).forEach(([key, value]) => {
		params.set(key, JSON.stringify(value));
	});
	return `${route}?${params.toString()}`;
}

export function openSavedView(
	view: SavedviewtypesSavedViewDTO,
	history: History,
): void {
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
		[QueryParams.viewName]: view.spec.displayName,
		[QueryParams.viewKey]: view.id,
	});
	history.push(url);
}

export async function openSavedViewByKey(
	viewKey: string,
	sourceHint: SavedViewSourceHint | null | undefined,
	history: History,
): Promise<void> {
	const view = await loadSavedView(viewKey, sourceHint);
	openSavedView(view, history);
}
