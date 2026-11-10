package clickhousetelemetrystore

import (
	"context"
	"encoding/json"
	"fmt"
	"reflect"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
)

// ExplainPlanNode is a node in ClickHouse's `EXPLAIN json = 1, indexes = 1`
// output, parsed to derive the granule-skip breakdown.
type ExplainPlanNode struct {
	NodeType    string             `json:"Node Type"`
	Description string             `json:"Description"`
	Indexes     []ExplainPlanIndex `json:"Indexes"`
	Plans       []ExplainPlanNode  `json:"Plans"`
}

// ExplainPlanIndex is one index entry under a ReadFromMergeTree node, reporting
// the parts/granules entering and surviving the index.
type ExplainPlanIndex struct {
	Type             string   `json:"Type"`
	Name             string   `json:"Name"`
	Keys             []string `json:"Keys"`
	Condition        string   `json:"Condition"`
	InitialParts     *int64   `json:"Initial Parts"`
	SelectedParts    *int64   `json:"Selected Parts"`
	InitialGranules  *int64   `json:"Initial Granules"`
	SelectedGranules *int64   `json:"Selected Granules"`
}

// RunExplainEstimate backs TelemetryStore.Estimate.
func RunExplainEstimate(ctx context.Context, conn clickhouse.Conn, stmt string, args ...any) ([]telemetrystoretypes.EstimateEntry, error) {
	if err := ValidateExplainStatement(stmt); err != nil {
		return nil, err
	}

	rows, err := conn.Query(ctx, "EXPLAIN ESTIMATE "+stmt, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to run EXPLAIN ESTIMATE")
	}
	defer rows.Close()

	colTypes := rows.ColumnTypes()
	var entries []telemetrystoretypes.EstimateEntry
	for rows.Next() {
		dest := make([]any, len(colTypes))
		for i, ct := range colTypes {
			dest[i] = reflect.New(ct.ScanType()).Interface()
		}
		if err := rows.Scan(dest...); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan EXPLAIN ESTIMATE row")
		}
		var entry telemetrystoretypes.EstimateEntry
		for i, ct := range colTypes {
			val := reflect.ValueOf(dest[i]).Elem().Interface()
			switch strings.ToLower(ct.Name()) {
			case "database":
				entry.Database = fmt.Sprintf("%v", val)
			case "table":
				entry.Table = fmt.Sprintf("%v", val)
			case "parts":
				entry.Parts = toInt64(val)
			case "rows":
				entry.Rows = toInt64(val)
			case "marks":
				entry.Marks = toInt64(val)
			}
		}
		entries = append(entries, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "EXPLAIN ESTIMATE row iteration failed")
	}
	return entries, nil
}

// RunExplainPlan backs TelemetryStore.Plan, returning the driver error when stmt
// does not parse or bind.
func RunExplainPlan(ctx context.Context, conn clickhouse.Conn, stmt string, args ...any) error {
	if err := ValidateExplainStatement(stmt); err != nil {
		return err
	}

	rows, err := conn.Query(ctx, "EXPLAIN PLAN "+stmt, args...)
	if err != nil {
		return err
	}
	rows.Close()
	return nil
}

// RunExplainIndexes backs TelemetryStore.Indexes, summing the breakdown
// across every ReadFromMergeTree node.
func RunExplainIndexes(ctx context.Context, conn clickhouse.Conn, stmt string, args ...any) (telemetrystoretypes.Granules, bool, error) {
	if err := ValidateExplainStatement(stmt); err != nil {
		return telemetrystoretypes.Granules{}, false, err
	}

	rows, err := conn.Query(ctx, "EXPLAIN json = 1, indexes = 1 "+stmt, args...)
	if err != nil {
		return telemetrystoretypes.Granules{}, false, errors.WrapInternalf(err, errors.CodeInternal, "failed to run EXPLAIN for granule stats")
	}
	defer rows.Close()

	// json=1 emits one JSON document; join rows in case the driver splits it.
	var sb strings.Builder
	for rows.Next() {
		var line string
		if err := rows.Scan(&line); err != nil {
			return telemetrystoretypes.Granules{}, false, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan EXPLAIN json row")
		}
		sb.WriteString(line)
		sb.WriteByte('\n')
	}
	if err := rows.Err(); err != nil {
		return telemetrystoretypes.Granules{}, false, errors.WrapInternalf(err, errors.CodeInternal, "EXPLAIN json row iteration failed")
	}

	var plans []struct {
		Plan ExplainPlanNode `json:"Plan"`
	}
	if err := json.Unmarshal([]byte(sb.String()), &plans); err != nil {
		return telemetrystoretypes.Granules{}, false, errors.WrapInternalf(err, errors.CodeInternal, "failed to parse EXPLAIN json")
	}

	var totalInitial, totalSelected int64
	reads := []telemetrystoretypes.MergeTreeRead{}
	for i := range plans {
		collectMergeTreeReads(&plans[i].Plan, &reads, &totalInitial, &totalSelected)
	}
	if totalInitial <= 0 {
		// No MergeTree index analysis — nothing to report.
		return telemetrystoretypes.Granules{}, false, nil
	}
	if totalSelected < 0 {
		totalSelected = 0
	}
	skippedGranules := totalInitial - totalSelected
	if skippedGranules < 0 {
		skippedGranules = 0
	}
	return telemetrystoretypes.Granules{
		Initial:  totalInitial,
		Selected: totalSelected,
		Skipped:  skippedGranules,
		Reads:    reads,
	}, true, nil
}

func collectMergeTreeReads(node *ExplainPlanNode, reads *[]telemetrystoretypes.MergeTreeRead, totalInitial, totalSelected *int64) {
	if node.NodeType == "ReadFromMergeTree" && len(node.Indexes) > 0 {
		steps := make([]telemetrystoretypes.IndexStep, 0, len(node.Indexes))
		var initial, selected *int64
		for i := range node.Indexes {
			idx := node.Indexes[i]
			if idx.InitialGranules != nil && initial == nil {
				initial = idx.InitialGranules
			}
			if idx.SelectedGranules != nil {
				selected = idx.SelectedGranules
			}
			steps = append(steps, telemetrystoretypes.IndexStep{
				Type:             idx.Type,
				Name:             idx.Name,
				Keys:             orEmpty(idx.Keys),
				Condition:        idx.Condition,
				InitialParts:     derefInt64(idx.InitialParts),
				SelectedParts:    derefInt64(idx.SelectedParts),
				InitialGranules:  derefInt64(idx.InitialGranules),
				SelectedGranules: derefInt64(idx.SelectedGranules),
			})
		}
		if initial != nil && selected != nil {
			*totalInitial += *initial
			*totalSelected += *selected
		}
		*reads = append(*reads, telemetrystoretypes.MergeTreeRead{Table: node.Description, Steps: steps})
	}
	for i := range node.Plans {
		collectMergeTreeReads(&node.Plans[i], reads, totalInitial, totalSelected)
	}
}

// toInt64 coerces a driver-scanned numeric value to int64 (0 if non-numeric).
func toInt64(v any) int64 {
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return rv.Int()
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return int64(rv.Uint())
	case reflect.Float32, reflect.Float64:
		return int64(rv.Float())
	default:
		return 0
	}
}

func derefInt64(p *int64) int64 {
	if p == nil {
		return 0
	}
	return *p
}

// orEmpty returns s, or a non-nil empty slice when s is nil.
func orEmpty[T any](s []T) []T {
	if s == nil {
		return []T{}
	}
	return s
}
