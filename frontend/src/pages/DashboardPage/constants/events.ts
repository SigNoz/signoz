export enum DashboardEvents {
	SWITCH_TO_EDIT_MODE = 'View Panel: Switch to edit mode',
	SWITCH_TO_VIEW_MODE = 'Edit Panel: Switch to view mode',
}

/**
 * Analytics events for the V2 dashboard detail page.
 * Fire via `logEvent(DashboardDetailEvents.<X>, { ...camelCaseProps })`.
 */
export enum DashboardDetailEvents {
	// Lifecycle
	Opened = 'Dashboard Detail V2: Opened',
	PanelDataFetched = 'Dashboard Detail V2: Panel data fetched',
	Renamed = 'Dashboard Detail V2: Dashboard renamed',
	Cloned = 'Dashboard Detail V2: Dashboard cloned',
	Deleted = 'Dashboard Detail V2: Dashboard deleted',
	LockToggled = 'Dashboard Detail V2: Lock toggled',
	FullScreenToggled = 'Dashboard Detail V2: Full screen toggled',
	StaleReloadPrompted = 'Dashboard Detail V2: Stale reload prompted',
	PublicUrlOpened = 'Dashboard Detail V2: Public URL opened',

	// Sections
	SectionAction = 'Dashboard Detail V2: Section action',
	SectionCollapsed = 'Dashboard Detail V2: Section collapsed',
	SectionsReordered = 'Dashboard Detail V2: Sections reordered',
	FirstSectionMigrationConfirmed = 'Dashboard Detail V2: First section migration confirmed',

	// Panels
	PanelAdded = 'Dashboard Detail V2: Panel added',
	// Reuses the existing V1 string so panel actions stay comparable across versions.
	PanelAction = 'Dashboard Detail: Panel action',
	PanelExported = 'Dashboard Detail V2: Panel exported',
	PanelViewed = 'Dashboard Detail V2: Panel viewed',
	PanelEditorSaved = 'Dashboard Detail V2: Panel editor saved',
	PanelEditorDiscarded = 'Dashboard Detail V2: Panel editor discarded',
	PanelTypeChanged = 'Dashboard Detail V2: Panel type changed',
	PanelSearched = 'Dashboard Detail V2: Panel searched',
	NoDataAction = 'Dashboard Detail V2: No data action',

	// Layout (high-frequency — fire rate-limited)
	LayoutChanged = 'Dashboard Detail V2: Layout changed',

	// Variables — setup
	VariableSaved = 'Dashboard Detail V2: Variable saved',
	VariableDeleted = 'Dashboard Detail V2: Variable deleted',
	VariableReordered = 'Dashboard Detail V2: Variable reordered',
	VariableQueryTested = 'Dashboard Detail V2: Variable query tested',
	ApplyToAllConfirmed = 'Dashboard Detail V2: Apply to all confirmed',

	// Variables — runtime selection
	VariableValueSelected = 'Dashboard Detail V2: Variable value selected',
	VariableMultiSelectCleared = 'Dashboard Detail V2: Variable multiselect cleared',
	VariableOptionsFetchFailed = 'Dashboard Detail V2: Variable options fetch failed',

	// Drill-down
	DrilldownOpened = 'Dashboard Detail V2: Drilldown opened',
	DrilldownAction = 'Dashboard Detail V2: Drilldown action',
	PanelZoomed = 'Dashboard Detail V2: Panel zoomed',

	// JSON editor
	JsonEditorOpened = 'Dashboard Detail V2: JSON editor opened',
	JsonEditorAction = 'Dashboard Detail V2: JSON editor action',

	// Settings & sharing
	SettingsOpened = 'Dashboard Detail V2: Settings opened',
	OverviewSaved = 'Dashboard Detail V2: Overview saved',
	OverviewDiscarded = 'Dashboard Detail V2: Overview discarded',
	CursorSyncChanged = 'Dashboard Detail V2: Cursor sync changed',
	PublicDashboardAction = 'Dashboard Detail V2: Public dashboard action',
}
