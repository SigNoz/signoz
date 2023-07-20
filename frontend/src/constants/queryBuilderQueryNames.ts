type QueryParamNames =
	| 'compositeQuery'
	| 'panelTypes'
	| 'pageSize'
	| 'viewMode'
	| 'selectedFields'
	| 'linesPerRow';

export const queryParamNamesMap: Record<QueryParamNames, QueryParamNames> = {
	compositeQuery: 'compositeQuery',
	panelTypes: 'panelTypes',
	pageSize: 'pageSize',
	viewMode: 'viewMode',
	selectedFields: 'selectedFields',
	linesPerRow: 'linesPerRow',
};
