package spantypes

// TraceStats is the single-row result of the trace summary aggregate query.
type TraceStats struct {
	StartNs            uint64
	EndNs              uint64
	RootServiceName    string
	RootEntryPoint     string
	RootSpanStatusCode string
	TotalSpans         uint64
	TotalErrorSpans    uint64
	HasMissingSpans    bool
	GenAISpanCount     uint64
	Tokens             TraceAITokens
	TotalCost          *float64
}

// GettableTraceSummary is the response for the trace summary API; the trace-level
// fields match the waterfall response.
type GettableTraceSummary struct {
	StartTimestampMillis  uint64          `json:"startTimestampMillis" required:"true"`
	EndTimestampMillis    uint64          `json:"endTimestampMillis" required:"true"`
	RootServiceName       string          `json:"rootServiceName" required:"true"`
	RootServiceEntryPoint string          `json:"rootServiceEntryPoint" required:"true"`
	RootSpanStatusCode    string          `json:"rootSpanStatusCode" required:"true"`
	TotalSpansCount       uint64          `json:"totalSpansCount" required:"true"`
	TotalErrorSpansCount  uint64          `json:"totalErrorSpansCount" required:"true"`
	HasMissingSpans       bool            `json:"hasMissingSpans" required:"true"`
	AI                    *TraceAISummary `json:"ai,omitempty"`
}

// TraceAISummary is present when any span carries a gen_ai gate key.
type TraceAISummary struct {
	Tokens TraceAITokens `json:"tokens" required:"true"`
	// TotalCost is omitted when no span carries a cost attribute.
	TotalCost *float64 `json:"totalCost,omitempty" nullable:"false"`
}

type TraceAITokens struct {
	Input      uint64 `json:"input" required:"true"`
	Output     uint64 `json:"output" required:"true"`
	CacheRead  uint64 `json:"cacheRead" required:"true"`
	CacheWrite uint64 `json:"cacheWrite" required:"true"`
	Reasoning  uint64 `json:"reasoning" required:"true"`
	// TotalInput is nil, not 0, when any span with input tokens lacks the key,
	// since a partial sum misleads and 0 is a valid total.
	TotalInput *uint64 `json:"totalInput,omitempty" nullable:"false"`
}

func NewGettableTraceSummary(stats *TraceStats) *GettableTraceSummary {
	summary := &GettableTraceSummary{
		StartTimestampMillis:  stats.StartNs / 1_000_000,
		EndTimestampMillis:    stats.EndNs / 1_000_000,
		RootServiceName:       stats.RootServiceName,
		RootServiceEntryPoint: stats.RootEntryPoint,
		RootSpanStatusCode:    stats.RootSpanStatusCode,
		TotalSpansCount:       stats.TotalSpans,
		TotalErrorSpansCount:  stats.TotalErrorSpans,
		HasMissingSpans:       stats.HasMissingSpans,
	}
	if stats.GenAISpanCount > 0 {
		summary.AI = &TraceAISummary{Tokens: stats.Tokens, TotalCost: stats.TotalCost}
	}
	return summary
}
