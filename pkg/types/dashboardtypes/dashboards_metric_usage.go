package dashboardtypes

// DashboardPanelRef identifies a single panel within a dashboard. The
// "dashboards by metric name" lookup returns these to report each panel that
// references a given metric.
type DashboardPanelRef struct {
	DashboardID   string `json:"dashboardId" required:"true"`
	DashboardName string `json:"dashboardName" required:"true"`
	PanelID       string `json:"panelId" required:"true"`
	PanelName     string `json:"panelName" required:"true"`
}
