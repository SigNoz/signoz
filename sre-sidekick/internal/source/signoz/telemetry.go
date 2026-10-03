package signoz

import (
	"context"
	"fmt"
	"time"

	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/evidence"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/profile"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/source"
)

// TelemetrySource queries every signal referenced by a profile. It keeps
// unsupported signals out of reports while making traces and metrics available
// to live audit-watch runs when SigNoz supports those raw query signals.
type TelemetrySource struct {
	Client *Client
	Limit  int
}

func NewTelemetrySource(client *Client, limit int) *TelemetrySource {
	if limit <= 0 {
		limit = 200
	}
	return &TelemetrySource{Client: client, Limit: limit}
}

func (s *TelemetrySource) Snapshot(ctx context.Context, p profile.Profile, target source.Target) (evidence.Snapshot, error) {
	if s.Client == nil {
		return evidence.Snapshot{}, fmt.Errorf("SigNoz client is required")
	}
	snapshot := evidence.Snapshot{
		QueryComplete:    true,
		AvailableSignals: map[string]bool{},
		Logs:             []evidence.Record{},
		Metrics:          []evidence.Record{},
		Traces:           []evidence.Record{},
		LastSeen:         map[string]time.Time{},
		DistinctValues:   map[string]int{},
	}
	for _, signal := range []string{"logs", "traces", "metrics"} {
		if !profileUsesSignal(p, signal) {
			continue
		}
		response, err := s.querySignal(ctx, signal, target)
		if err != nil {
			snapshot.QueryComplete = false
			snapshot.Partial = true
			continue
		}
		part := normalizeSignal(response, signal, s.Limit)
		snapshot.AvailableSignals[signal] = true
		snapshot.QueryComplete = snapshot.QueryComplete && part.QueryComplete
		snapshot.Partial = snapshot.Partial || part.Partial
		snapshot.Logs = append(snapshot.Logs, part.Logs...)
		snapshot.Traces = append(snapshot.Traces, part.Traces...)
		snapshot.Metrics = append(snapshot.Metrics, part.Metrics...)
		for key, value := range part.LastSeen {
			if value.After(snapshot.LastSeen[key]) {
				snapshot.LastSeen[key] = value
			}
		}
		for key, value := range part.DistinctValues {
			snapshot.DistinctValues[key] += value
		}
	}
	return snapshot, nil
}

func (s *TelemetrySource) querySignal(ctx context.Context, signal string, target source.Target) (rawLogsResponse, error) {
	filter := fmt.Sprintf("resource.service.name = '%s'", escapeFilter(target.Service))
	if target.Environment != "" {
		filter += fmt.Sprintf(" AND resource.deployment.environment = '%s'", escapeFilter(target.Environment))
	}
	request := map[string]any{
		"schemaVersion": "v1", "start": target.Start.UnixMilli(), "end": target.End.UnixMilli(),
		"requestType": "raw", "noCache": true,
		"compositeQuery": map[string]any{"queries": []any{map[string]any{
			"type": "builder_query",
			"spec": map[string]any{
				"name": "A", "signal": signal, "disabled": false, "limit": s.Limit, "offset": 0,
				"filter": map[string]any{"expression": filter},
				"order": []any{
					map[string]any{"key": map[string]any{"name": "timestamp"}, "direction": "desc"},
					map[string]any{"key": map[string]any{"name": "id"}, "direction": "desc"},
				},
				"aggregations": []any{map[string]any{"expression": "count()"}},
			},
		}}},
		"formatOptions": map[string]any{"formatTableResultForUI": false, "fillGaps": false},
	}
	var response rawLogsResponse
	if err := s.Client.QueryRange(ctx, request, &response); err != nil {
		return rawLogsResponse{}, err
	}
	if response.Status != "success" {
		return rawLogsResponse{}, fmt.Errorf("SigNoz %s query returned status %q", signal, response.Status)
	}
	return response, nil
}

func normalizeSignal(response rawLogsResponse, signal string, limit int) evidence.Snapshot {
	snapshot := evidence.Snapshot{
		QueryComplete: response.Status == "success", Logs: []evidence.Record{},
		Traces: []evidence.Record{}, Metrics: []evidence.Record{},
		LastSeen: map[string]time.Time{}, DistinctValues: map[string]int{},
	}
	distinct := map[string]map[string]struct{}{}
	rows := 0
	for _, result := range response.Data.Data.Results {
		for _, row := range result.Rows {
			rows++
			fields := flattenLogData(row.Data)
			fields["timestamp"] = row.Timestamp
			selector := signal
			for _, key := range []string{"name", "span_name", "metric_name", "operation_name"} {
				if value, ok := fields[key].(string); ok && value != "" {
					selector = value
					break
				}
			}
			record := evidence.Record{Selector: selector, Fields: fields}
			switch signal {
			case "logs":
				snapshot.Logs = append(snapshot.Logs, record)
			case "traces":
				snapshot.Traces = append(snapshot.Traces, record)
			case "metrics":
				snapshot.Metrics = append(snapshot.Metrics, record)
			}
			for key, value := range fields {
				if isEmpty(value) {
					continue
				}
				if row.Timestamp.After(snapshot.LastSeen[key]) {
					snapshot.LastSeen[key] = row.Timestamp
				}
				if isScalar(value) {
					if distinct[key] == nil {
						distinct[key] = map[string]struct{}{}
					}
					distinct[key][fmt.Sprintf("%T:%v", value, value)] = struct{}{}
				}
			}
		}
	}
	if limit > 0 && rows >= limit {
		snapshot.Partial = true
		snapshot.QueryComplete = false
	}
	for key, values := range distinct {
		snapshot.DistinctValues[key] = len(values)
	}
	return snapshot
}

func profileUsesSignal(p profile.Profile, signal string) bool {
	for _, rule := range p.Spec.AuditRules {
		if rule.Signal == signal {
			return true
		}
	}
	switch signal {
	case "logs":
		return len(p.Spec.Signals.Logs.Fields) > 0 || len(p.Spec.Signals.Logs.Spans) > 0
	case "traces":
		return p.Spec.Signals.Traces.RootSpan != "" || len(p.Spec.Signals.Traces.Fields) > 0 || len(p.Spec.Signals.Traces.Spans) > 0
	case "metrics":
		return len(p.Spec.Signals.Metrics.Fields) > 0 || len(p.Spec.Signals.Metrics.Spans) > 0
	default:
		return false
	}
}
