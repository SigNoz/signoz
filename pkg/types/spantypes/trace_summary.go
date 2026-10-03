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
	StartTimestampMillis  uint64          `json:"startTimestampMillis"`
	EndTimestampMillis    uint64          `json:"endTimestampMillis"`
	RootServiceName       string          `json:"rootServiceName"`
	RootServiceEntryPoint string          `json:"rootServiceEntryPoint"`
	RootSpanStatusCode    string          `json:"rootSpanStatusCode"`
	TotalSpansCount       uint64          `json:"totalSpansCount"`
	TotalErrorSpansCount  uint64          `json:"totalErrorSpansCount"`
	HasMissingSpans       bool            `json:"hasMissingSpans"`
	AI                    *TraceAISummary `json:"ai,omitempty"`
}

// TraceAISummary is present when any span carries a gen_ai gate key.
type TraceAISummary struct {
	Tokens TraceAITokens `json:"tokens"`
	// TotalCost is null when no span carries a cost attribute.
	TotalCost *float64 `json:"totalCost" nullable:"true"`
}

type TraceAITokens struct {
	Input      uint64 `json:"input"`
	Output     uint64 `json:"output"`
	CacheRead  uint64 `json:"cacheRead"`
	CacheWrite uint64 `json:"cacheWrite"`
	Reasoning  uint64 `json:"reasoning"`
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
