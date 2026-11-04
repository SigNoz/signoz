package dashboardtypes

// DashboardPanelRef identifies a single panel/widget within a dashboard that
// references a given metric, along with the group-by and filter labels used for
// that metric so callers can reason about the impact of dropping its labels.
type DashboardPanelRef struct {
	DashboardID   string   `json:"dashboardId" required:"true" description:"The id of the dashboard containing the panel."`
	DashboardName string   `json:"dashboardName" required:"true" description:"The dashboard name."`
	PanelID       string   `json:"panelId" required:"true" description:"The panel id within the dashboard."`
	PanelName     string   `json:"panelName" required:"true" description:"The panel title."`
	GroupBy       []string `json:"groupBy,omitempty" description:"The metric labels the panel groups by."`
	FilterBy      []string `json:"filterBy,omitempty" description:"The metric labels the panel filters on."`
}
