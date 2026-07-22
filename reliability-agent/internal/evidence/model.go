package evidence

import "time"

// Snapshot is the normalized input consumed by Track A. A source adapter such
// as SigNoz, Prometheus, or Tempo converts its native response into this shape.
type Snapshot struct {
	QueryComplete  bool                 `json:"query_complete"`
	Partial        bool                 `json:"partial"`
	Traces         []Record             `json:"traces"`
	Metrics        []Record             `json:"metrics"`
	Logs           []Record             `json:"logs"`
	LastSeen       map[string]time.Time `json:"last_seen"`
	DistinctValues map[string]int       `json:"distinct_values"`
}

type Record struct {
	Selector string         `json:"selector"`
	Fields   map[string]any `json:"fields"`
}

func (s Snapshot) Complete() bool {
	return s.QueryComplete && !s.Partial
}

func (s Snapshot) Records(signal string) []Record {
	switch signal {
	case "traces":
		return s.Traces
	case "metrics":
		return s.Metrics
	case "logs":
		return s.Logs
	default:
		return nil
	}
}
