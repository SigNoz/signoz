type QueryParamNames =
	| 'compositeQuery'
	| 'panelTypes'
	| 'pageSize'
	| 'viewMode'
	| 'selectedFields'
	| 'linesPerRow';

export type QuerySearchParamNames = 'viewName' | 'viewKey';

export const queryParamNamesMap: Record<QueryParamNames, QueryParamNames> = {
	compositeQuery: 'compositeQuery',
	panelTypes: 'panelTypes',
	pageSize: 'pageSize',
	viewMode: 'viewMode',
	selectedFields: 'selectedFields',
	linesPerRow: 'linesPerRow',
};

export const querySearchParams: Record<
	QuerySearchParamNames,
	QuerySearchParamNames
> = {
	viewName: 'viewName',
	viewKey: 'viewKey',
};
