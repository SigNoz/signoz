package dashboardtypes

// Temporary v1→v2 bulk-migration scaffolding. It lives only on the migration
// feature branches (removed from the base branch that merges to main) and is
// kept in a dedicated file so base→branch merges stay conflict-free.

// V1ToV2MigrationResult is the summary of migrating every dashboard in an org
// from the v1 to the v2 schema in place. Each v1 dashboard's stored data is
// converted and overwritten; dashboards already in v2 are skipped.
type V1ToV2MigrationResult struct {
	Total    int                   `json:"total"`
	Migrated int                   `json:"migrated"`
	Skipped  int                   `json:"skipped"`
	Failed   int                   `json:"failed"`
	Results  []V1ToV2MigrationItem `json:"results"`
}

type V1ToV2MigrationItem struct {
	ID     string `json:"id"`
	Status string `json:"status"` // migrated | skipped | failed
	Error  string `json:"error,omitempty"`
}
