/**
 * Analytics events for the V2 dashboards list page.
 * Fire via `logEvent(DashboardListEvents.<X>, { ...camelCaseProps })`.
 */
export enum DashboardListEvents {
	// Creating / importing
	CreateModalTabChanged = 'Dashboard List V2: Create modal tab changed',
	DashboardCreated = 'Dashboard List V2: Dashboard created',
	ImportFailed = 'Dashboard List V2: Import failed',

	// Finding dashboards (search / filter / sort / columns / pin / pagination)
	SearchExecuted = 'Dashboard List V2: Search executed',
	FilterApplied = 'Dashboard List V2: Filter applied',
	FiltersCleared = 'Dashboard List V2: Filters cleared',
	SortChanged = 'Dashboard List V2: Sort changed',
	ColumnsToggled = 'Dashboard List V2: Columns toggled',
	DashboardPinned = 'Dashboard List V2: Dashboard pinned',
	Paginated = 'Dashboard List V2: Paginated',

	// Views rail
	ViewSelected = 'Dashboard List V2: View selected',
	ViewSaved = 'Dashboard List V2: View saved',
	ViewRenamed = 'Dashboard List V2: View renamed',
	ViewDeleted = 'Dashboard List V2: View deleted',
	ViewReset = 'Dashboard List V2: View reset',
	RailToggled = 'Dashboard List V2: Rail toggled',

	// Row actions (grouped: view / openNewTab / copyLink / rename / editTags / duplicate / lock / unlock / delete)
	RowAction = 'Dashboard List V2: Row action',

	// Legacy (V1) dashboard explainer dialog
	LegacyDialogAction = 'Dashboard List V2: Legacy dialog action',

	// Error / empty states
	ErrorStateAction = 'Dashboard List V2: Error state action',
}
