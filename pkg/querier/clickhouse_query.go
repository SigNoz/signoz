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
	"github.com/SigNoz/signoz/pkg/clickhousesql"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
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
	limits ClickHouseQueryConfig
}

var _ qbtypes.Query = (*chSQLQuery)(nil)
var _ qbtypes.StatementProvider = (*chSQLQuery)(nil)

func newchSQLQuery(
	logger *slog.Logger,
	telemetryStore telemetrystore.TelemetryStore,
	query qbtypes.ClickHouseQuery,
	args []any,
	tr qbtypes.TimeRange,
	kind qbtypes.RequestType,
	variables map[string]qbtypes.VariableItem,
	limits ClickHouseQueryConfig,
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
		limits:         limits,
	}
}

func (q *chSQLQuery) Fingerprint() string {
	// No caching for CH queries for now
	return ""
}

func (q *chSQLQuery) Window() (uint64, uint64) { return q.fromMS, q.toMS }

// TODO(srikanthccv): cleanup the templating logic.
func (q *chSQLQuery) renderVars(query string, vars map[string]qbtypes.VariableItem, start, end uint64) (string, error) {
	varsData := map[string]any{}
	for k, v := range vars {
		varsData[k] = clickhousesql.Literal(v.Value)
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
		query = strings.ReplaceAll(query, fmt.Sprintf("{{%s}}", k), fmt.Sprint(varsData[k]))
		query = strings.ReplaceAll(query, fmt.Sprintf("[[%s]]", k), fmt.Sprint(varsData[k]))
		query = strings.ReplaceAll(query, fmt.Sprintf("$%s", k), fmt.Sprint(varsData[k]))
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

func (q *chSQLQuery) render(ctx context.Context) (string, error) {
	rendered, err := q.renderVars(q.query.Query, q.vars, q.fromMS, q.toMS)
	if err != nil {
		return "", err
	}

	clickhousesql.LogIfStatementIsNotValid(ctx, q.logger, rendered)

	return rendered, nil
}

// Statement renders the SQL without executing it, for the preview path.
func (q *chSQLQuery) Statement(ctx context.Context) (*qbtypes.Statement, error) {
	rendered, err := q.render(ctx)
	if err != nil {
		return nil, err
	}
	return &qbtypes.Statement{Query: rendered, Args: q.args}, nil
}

func (q *chSQLQuery) Execute(ctx context.Context) (*qbtypes.Result, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.QueryDuration: instrumentationtypes.DurationBucket(q.fromMS, q.toMS),
	})

	totalRows := uint64(0)
	totalBytes := uint64(0)
	elapsed := time.Duration(0)

	ctx = clickhouse.Context(ctx, clickhouse.WithProgress(func(p *clickhouse.Progress) {
		totalRows += p.Rows
		totalBytes += p.Bytes
		elapsed += p.Elapsed
	}))

	query, err := q.render(ctx)
	if err != nil {
		return nil, err
	}

	if q.limits.MaxExecutionTime > 0 {
		var cancel context.CancelFunc
		// TODO: clickhouse-go replaces a lower max_execution_time setting with the ctx deadline, so the limit is a
		// deadline until https://github.com/ClickHouse/clickhouse-go/issues/2100 is fixed.
		ctx, cancel = context.WithTimeout(ctx, q.limits.MaxExecutionTime)
		defer cancel()
	}
	ctx = telemetrystore.NewContextWithQuerySettings(ctx, q.limits.settings())

	rows, err := q.telemetryStore.ClickhouseDB().Query(ctx, query, q.args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

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

// settings returns the limits as ClickHouse query settings. A SETTINGS clause in the user's SQL
// overrides them. MaxExecutionTime is a context deadline instead.
func (config ClickHouseQueryConfig) settings() clickhouse.Settings {
	settings := clickhouse.Settings{}
	if config.MaxMemoryUsage > 0 {
		settings["max_memory_usage"] = config.MaxMemoryUsage
	}
	if config.MaxResultRows > 0 {
		settings["max_result_rows"] = config.MaxResultRows
		settings["result_overflow_mode"] = "throw"
	}
	if config.MaxResultBytes > 0 {
		settings["max_result_bytes"] = config.MaxResultBytes
		settings["result_overflow_mode"] = "throw"
	}
	return settings
}
