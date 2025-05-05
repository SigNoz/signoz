package querybuildertypesv5

type ClickHouseQuery struct {
	Query    string `json:"query"`
	Disabled bool   `json:"disabled"`
}
