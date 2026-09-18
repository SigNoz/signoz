package spantypes

import "github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"

// TraceStatsGenAIColumns pairs each summed TraceStats column with the gen_ai attribute it sums.
var TraceStatsGenAIColumns = []TraceStatsGenAIColumn{
	{Column: "input_tokens", Key: aiobservabilitytypes.GenAIUsageInputTokens},
	{Column: "output_tokens", Key: aiobservabilitytypes.GenAIUsageOutputTokens},
	{Column: "cache_read_tokens", Key: aiobservabilitytypes.GenAIUsageCacheReadInputTokens},
	{Column: "cache_write_tokens", Key: aiobservabilitytypes.GenAIUsageCacheCreationInputTokens},
	{Column: "reasoning_tokens", Key: aiobservabilitytypes.GenAIUsageReasoningOutputTokens},
	{Column: "total_cost", Key: aiobservabilitytypes.SignozGenAITotalCost},
}

type TraceStatsGenAIColumn struct {
	Column string
	Key    string
}

// TraceStats is the single-row result of the trace summary aggregate query.
type TraceStats struct {
	StartNs         uint64
	EndNs           uint64
	RootServiceName string
	RootEntryPoint  string
	TotalSpans      uint64
	TotalErrorSpans uint64
	HasMissingSpans bool
	GenAISpanCount  uint64
	Tokens          TraceAITokens
	TotalCost       *float64
}

// GettableTraceSummary is the response for the trace summary API; the trace-level
// fields match the waterfall response.
type GettableTraceSummary struct {
	StartTimestampMillis  uint64          `json:"startTimestampMillis"`
	EndTimestampMillis    uint64          `json:"endTimestampMillis"`
	RootServiceName       string          `json:"rootServiceName"`
	RootServiceEntryPoint string          `json:"rootServiceEntryPoint"`
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
		TotalSpansCount:       stats.TotalSpans,
		TotalErrorSpansCount:  stats.TotalErrorSpans,
		HasMissingSpans:       stats.HasMissingSpans,
	}
	if stats.GenAISpanCount > 0 {
		summary.AI = &TraceAISummary{Tokens: stats.Tokens, TotalCost: stats.TotalCost}
	}
	return summary
}
