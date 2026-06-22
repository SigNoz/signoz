import { getAllViews } from 'api/saveView/getAllViews';
import { getViewById } from 'api/saveView/getViewById';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { SOURCEPAGE_VS_ROUTES } from 'pages/SaveView/constants';
import { ViewProps } from 'types/api/saveViews/types';
import { DataSource } from 'types/common/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { History } from 'history';

type SavedViewSourceHint = DataSource | 'meter';

const DEFAULT_PROBE_SOURCES: SavedViewSourceHint[] = [
	DataSource.LOGS,
	DataSource.TRACES,
	DataSource.METRICS,
];

export async function findSavedViewInLists(
	viewKey: string,
	sourceHint?: SavedViewSourceHint | null,
): Promise<ViewProps | null> {
	const sources = sourceHint ? [sourceHint] : DEFAULT_PROBE_SOURCES;

	for (const source of sources) {
		try {
			const response = await getAllViews(source);
			const match = response.data.data.find((view) => view.id === viewKey);
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
): Promise<ViewProps> {
	try {
		const response = await getViewById(viewKey);
		if (response.data?.data) {
			return response.data.data;
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

export function openSavedView(view: ViewProps, history: History): void {
	const route = explorerRouteForSourcePage(view.sourcePage);
	if (!route) {
		throw new Error('Unsupported saved view source');
	}

	if (!view.compositeQuery) {
		throw new Error('Saved view is missing query data');
	}

	const query = mapQueryDataFromApi(view.compositeQuery);
	const url = buildExplorerNavigationUrl(route, query, {
		[QueryParams.panelTypes]: view.compositeQuery.panelType as PANEL_TYPES,
		[QueryParams.viewName]: view.name,
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

/** @deprecated Use findSavedViewInLists — kept for tests. */
export const findSavedView = findSavedViewInLists;
