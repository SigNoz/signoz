package querybuildertypesv5

type PromQuery struct {
	Query    string `json:"query"`
	Stats    string `json:"stats,omitempty"`
	Disabled bool   `json:"disabled"`
}
