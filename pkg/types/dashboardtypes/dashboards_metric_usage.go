package dashboardtypes

// DashboardPanelRef identifies a single panel/widget within a dashboard that
// references a given metric, along with the group-by and filter labels used for
// that metric so callers can reason about the impact of dropping its labels.
type DashboardPanelRef struct {
	DashboardID   string   `json:"dashboardId" required:"true"`
	DashboardName string   `json:"dashboardName" required:"true"`
	PanelID       string   `json:"panelId" required:"true"`
	PanelName     string   `json:"panelName" required:"true"`
	GroupBy       []string `json:"groupBy,omitempty"`
	FilterBy      []string `json:"filterBy,omitempty"`
}
