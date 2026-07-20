package savedviewtypes

// ListSavedViewsParams describes the query params accepted by the saved
// views list endpoint. It exists purely to document the endpoint's query
// params in the generated OpenAPI spec -- the handler parses these directly
// off the request URL.
type ListSavedViewsParams struct {
	SourcePage string `query:"sourcePage"`
	Name       string `query:"name"`
	Category   string `query:"category"`
}
