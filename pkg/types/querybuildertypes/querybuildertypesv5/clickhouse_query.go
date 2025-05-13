package querybuildertypesv5

type ClickHouseQuery struct {
	Name     string `json:"name"`
	Query    string `json:"query"`
	Disabled bool   `json:"disabled"`
}
