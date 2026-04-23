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

	chproto "github.com/ClickHouse/ch-go/proto"
	"github.com/ClickHouse/clickhouse-go/v2"
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

// userFacingCHCodes are ClickHouse error codes that indicate a problem with the
// query itself (bad SQL, unknown table/column, etc.) rather than a server-side
// failure. This list is incomplete and should be expanded as we discover more error codes that should map to HTTP 400 instead of 500.
// It is a subset of the error codes that are known to be user-facing.
var userFacingCHCodes = map[chproto.Error]bool{
	chproto.ErrSyntaxError:                  true,
	chproto.ErrUnknownTable:                 true,
	chproto.ErrUnknownDatabase:              true,
	chproto.ErrUnknownIdentifier:            true,
	chproto.ErrUnknownFunction:              true,
	chproto.ErrUnknownAggregateFunction:     true,
	chproto.ErrUnknownType:                  true,
	chproto.ErrUnknownStorage:               true,
	chproto.ErrUnknownElementInAst:          true,
	chproto.ErrUnknownTypeOfQuery:           true,
	chproto.ErrIllegalTypeOfArgument:        true,
	chproto.ErrIllegalColumn:                true,
	chproto.ErrNumberOfArgumentsDoesntMatch: true,
	chproto.ErrTooManyArgumentsForFunction:  true,
	chproto.ErrTooLessArgumentsForFunction:  true,
}

func mapClickHouseError(err error) error {
	var ex *clickhouse.Exception
	if errors.As(err, &ex) && userFacingCHCodes[chproto.Error(ex.Code)] {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "%s", ex.Message)
	}
	return err
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

	query, err := q.renderVars(q.query.Query, q.vars, q.fromMS, q.toMS)
	if err != nil {
		return nil, err
	}

	rows, err := q.telemetryStore.ClickhouseDB().Query(ctx, query, q.args...)
	if err != nil {
		return nil, mapClickHouseError(err)
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
