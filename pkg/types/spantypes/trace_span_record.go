package spantypes

// TruncatedField names a value of a span record that was cut, with its full length in characters.
type TruncatedField struct {
	Field  string `json:"field" required:"true"`
	Length uint64 `json:"length" required:"true"`
}

// SpanRecord is everything stored on a span. Long values are cut and listed in Truncated.
type SpanRecord struct {
	SpanID        string            `json:"spanId" required:"true"`
	StatusCode    string            `json:"statusCode" required:"true"`
	StatusMessage string            `json:"statusMessage" required:"true"`
	Attributes    map[string]any    `json:"attributes" required:"true" nullable:"false"`
	Resource      map[string]string `json:"resource" required:"true" nullable:"false"`
	Events        []EventV2         `json:"events" required:"true" nullable:"false"`
	// Links holds the spans this span links to, in this or another trace.
	Links     []Link           `json:"links" required:"true" nullable:"false"`
	Truncated []TruncatedField `json:"truncated" required:"true" nullable:"false"`
}
