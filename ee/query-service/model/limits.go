package model

type QueryLimit struct {
	// Name of the query limit
	Name string `db:"name" json:"name"`

	// Title of the query limit
	Title string `db:"title" json:"title"`
	// UsageLimit indicates the usage limit of the query
	// If the usage limit is 0, then there is no limit
	UsageLimit int `db:"usage_limit" json:"usage_limit"`
}
