package querybuildertypesv5

type PromQuery struct {
	Name     string `json:"name"`
	Query    string `json:"query"`
	Stats    string `json:"stats,omitempty"`
	Disabled bool   `json:"disabled"`
}
