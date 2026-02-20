package querier

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"sort"
	"strings"
	"text/template"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	chVariables "github.com/SigNoz/signoz/pkg/variables/clickhouse"
)

type chSQLQuery struct {
	logger         *slog.Logger
	telemetryStore telemetrystore.TelemetryStore

	query  qbtypes.ClickHouseQuery
	args   []any
	fromMS uint64
	toMS   uint64
	kind   qbtypes.RequestType
	vars   map[string]qbtypes.VariableItem
}

var _ qbtypes.Query = (*chSQLQuery)(nil)

func newchSQLQuery(
	logger *slog.Logger,
	telemetryStore telemetrystore.TelemetryStore,
	query qbtypes.ClickHouseQuery,
	args []any,
	tr qbtypes.TimeRange,
	kind qbtypes.RequestType,
	variables map[string]qbtypes.VariableItem,
) *chSQLQuery {
	return &chSQLQuery{
		logger:         logger,
		telemetryStore: telemetryStore,
		query:          query,
		args:           args,
		fromMS:         tr.From,
		toMS:           tr.To,
		kind:           kind,
		vars:           variables,
	}
}

func (q *chSQLQuery) Fingerprint() string {
	// No caching for CH queries for now
	return ""
}

func (q *chSQLQuery) Window() (uint64, uint64) { return q.fromMS, q.toMS }

// convertToVariableValues converts a map of VariableItem to a slice of VariableValue
// for use with the QueryTransformer. It checks for dynamic variables with __all__ value
// and marks them as IsSelectAll=true so the transformer can remove their filters.
func convertToVariableValues(vars map[string]qbtypes.VariableItem) []chVariables.VariableValue {
	result := make([]chVariables.VariableValue, 0, len(vars))
	for name, item := range vars {
		vv := chVariables.VariableValue{
			Name:        name,
			IsSelectAll: false,
			FieldType:   "scalar",
		}
		// Check if this is a dynamic variable with __all__ value
		if item.Type == qbtypes.DynamicVariableType {
			if allVal, ok := item.Value.(string); ok && allVal == "__all__" {
				vv.IsSelectAll = true
			}
		}
		result = append(result, vv)
	}
	return result
}

// hasAllVars checks if any variable has __all__ value
func hasAllVars(vars map[string]qbtypes.VariableItem) bool {
	for _, item := range vars {
		if item.Type == qbtypes.DynamicVariableType {
			if allVal, ok := item.Value.(string); ok && allVal == "__all__" {
				return true
			}
		}
	}
	return false
}

// TODO(srikanthccv): cleanup the templating logic
func (q *chSQLQuery) renderVars(query string, vars map[string]qbtypes.VariableItem, start, end uint64) (string, error) {
	originalQuery := query

	// Transform query to remove filters for variables with __all__ value.
	// This must happen before variable substitution so we can detect variable references
	// in their original form ($var, {{var}}, [[var]]).
	// See: https://github.com/SigNoz/signoz/issues/9889
	if hasAllVars(vars) {
		varValues := convertToVariableValues(vars)
		transformer := chVariables.NewQueryTransformer(query, varValues)
		transformedQuery, err := transformer.Transform()
		if err != nil {
			// Passthrough mode: log error but continue with original query
			// This ensures we don't break existing queries while validating the transformer
			q.logger.ErrorContext(context.Background(), "query transformer failed, using original query",
				"error", err,
				"query", query)
		} else if transformedQuery != originalQuery {
			// Log when transformation modifies the query - helps track __all__ variable usage
			// and validates transformer behavior in production before full rollout
			q.logger.InfoContext(context.Background(), "query transformed for __all__ variables",
				"original", originalQuery,
				"transformed", transformedQuery)
			query = transformedQuery
		}
	}

	varsData := map[string]any{}
	for k, v := range vars {
		varsData[k] = formatValueForCH(v.Value)
	}

	querybuilder.AssignReservedVars(varsData, start, end)

	keys := make([]string, 0, len(varsData))
	for k := range varsData {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool {
		return len(keys[i]) > len(keys[j])
	})

	for _, k := range keys {
		query = strings.Replace(query, fmt.Sprintf("{{%s}}", k), fmt.Sprint(varsData[k]), -1)
		query = strings.Replace(query, fmt.Sprintf("[[%s]]", k), fmt.Sprint(varsData[k]), -1)
		query = strings.Replace(query, fmt.Sprintf("$%s", k), fmt.Sprint(varsData[k]), -1)
	}

	tmpl := template.New("clickhouse-query")
	tmpl, err := tmpl.Parse(query)
	if err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "error while replacing template variables")
	}
	var newQuery bytes.Buffer

	// replace go template variables
	err = tmpl.Execute(&newQuery, varsData)
	if err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "error while replacing template variables")
	}
	return newQuery.String(), nil
}

func (q *chSQLQuery) Execute(ctx context.Context) (*qbtypes.Result, error) {

	totalRows := uint64(0)
	totalBytes := uint64(0)
	elapsed := time.Duration(0)

	ctx = clickhouse.Context(ctx, clickhouse.WithProgress(func(p *clickhouse.Progress) {
		totalRows += p.Rows
		totalBytes += p.Bytes
		elapsed += p.Elapsed
	}))

	query, err := q.renderVars(q.query.Query, q.vars, q.fromMS, q.toMS)
	if err != nil {
		return nil, err
	}

	rows, err := q.telemetryStore.ClickhouseDB().Query(ctx, query, q.args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// TODO: map the errors from ClickHouse to our error types
	payload, err := consume(rows, q.kind, nil, qbtypes.Step{}, q.query.Name)
	if err != nil {
		return nil, err
	}
	return &qbtypes.Result{
		Type:  q.kind,
		Value: payload,
		Stats: qbtypes.ExecStats{
			RowsScanned:  totalRows,
			BytesScanned: totalBytes,
			DurationMS:   uint64(elapsed.Milliseconds()),
		},
	}, nil
}
