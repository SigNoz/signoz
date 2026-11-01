package implannotations

import (
	"context"
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/annotationtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

const resourceBucketSeconds = 1800

type signalTables struct {
	signal        telemetrytypes.Signal
	dbName        string
	resourceTable string
	dataTable     string
	rawAlias      string
}

var (
	tracesTables = signalTables{
		signal:        telemetrytypes.SignalTraces,
		dbName:        tracestelemetryschema.DBName,
		resourceTable: tracestelemetryschema.TracesResourceV3TableName,
		dataTable:     tracestelemetryschema.SpanIndexV3TableName,
		rawAlias:      "raw_traces",
	}
	logsTables = signalTables{
		signal:        telemetrytypes.SignalLogs,
		dbName:        logstelemetryschema.DBName,
		resourceTable: logstelemetryschema.LogsResourceV2TableName,
		dataTable:     logstelemetryschema.LogsV2TableName,
		rawAlias:      "raw_logs",
	}
)

// queryTracesDeployments returns the marker rows and historyAvailableFrom in ms, 0 when there is no trace history.
func (m *module) queryTracesDeployments(ctx context.Context, orgID valuer.UUID, req *annotationtypes.PostableAnnotations) ([]annotationtypes.DeploymentRow, int64, error) {
	ctx = m.withAnnotationsContext(ctx, telemetrytypes.SignalTraces, "ListAnnotations")

	filterClause, err := m.buildFilterClause(ctx, orgID, telemetrytypes.SignalTraces, req.Filter, req.Start, req.End)
	if err != nil {
		return nil, 0, err
	}

	rBucket, err := m.readHistoryEdge(ctx, tracesTables)
	if err != nil {
		return nil, 0, err
	}
	if rBucket == 0 {
		return []annotationtypes.DeploymentRow{}, 0, nil
	}

	query, args := buildTracesDeploymentsQuery(filterClause, req.Start, req.End, rBucket)
	rows, err := m.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, 0, errors.WrapInternalf(err, errors.CodeInternal, "failed to query traces deployments")
	}
	defer rows.Close()

	result := []annotationtypes.DeploymentRow{}
	for rows.Next() {
		var (
			row       = annotationtypes.DeploymentRow{Signal: telemetrytypes.SignalTraces}
			firstSeen time.Time
			firstIDs  []string
		)
		if err := rows.Scan(&row.Service, &row.Environment, &row.Version, &firstSeen, &firstIDs, &row.Labels); err != nil {
			return nil, 0, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan traces deployment row")
		}
		row.FirstSeen = firstSeen.UnixMilli()
		if len(firstIDs) == 2 {
			row.TraceID = firstIDs[0]
			row.SpanID = firstIDs[1]
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, errors.WrapInternalf(err, errors.CodeInternal, "failed to iterate traces deployment rows")
	}

	return result, historyAvailableFromMs(rBucket), nil
}

// queryLogsDeployments returns the marker rows and historyAvailableFrom in ms, 0 when there is no log history.
func (m *module) queryLogsDeployments(ctx context.Context, orgID valuer.UUID, req *annotationtypes.PostableAnnotations) ([]annotationtypes.DeploymentRow, int64, error) {
	ctx = m.withAnnotationsContext(ctx, telemetrytypes.SignalLogs, "ListAnnotations")

	filterClause, err := m.buildFilterClause(ctx, orgID, telemetrytypes.SignalLogs, req.Filter, req.Start, req.End)
	if err != nil {
		return nil, 0, err
	}

	rBucket, err := m.readHistoryEdge(ctx, logsTables)
	if err != nil {
		return nil, 0, err
	}
	if rBucket == 0 {
		return []annotationtypes.DeploymentRow{}, 0, nil
	}

	query, args := buildLogsDeploymentsQuery(filterClause, req.Start, req.End, rBucket)
	rows, err := m.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, 0, errors.WrapInternalf(err, errors.CodeInternal, "failed to query logs deployments")
	}
	defer rows.Close()

	result := []annotationtypes.DeploymentRow{}
	for rows.Next() {
		var (
			row         = annotationtypes.DeploymentRow{Signal: telemetrytypes.SignalLogs}
			firstSeenNs uint64
		)
		if err := rows.Scan(&row.Service, &row.Environment, &row.Version, &firstSeenNs, &row.LogID, &row.Labels); err != nil {
			return nil, 0, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan logs deployment row")
		}
		row.FirstSeen = int64(firstSeenNs / 1000000)
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, errors.WrapInternalf(err, errors.CodeInternal, "failed to iterate logs deployment rows")
	}

	return result, historyAvailableFromMs(rBucket), nil
}

// readHistoryEdge returns the oldest bucket the resource table holds, 0 when it is empty.
func (m *module) readHistoryEdge(ctx context.Context, tables signalTables) (int64, error) {
	var rBucket int64
	if err := m.telemetryStore.ClickhouseDB().QueryRow(ctx, buildHistoryEdgeQuery(tables)).Scan(&rBucket); err != nil {
		return 0, errors.WrapInternalf(err, errors.CodeInternal, "failed to read %s retention edge", tables.signal.StringValue())
	}
	return rBucket, nil
}

func buildTracesDeploymentsQuery(filterClause *sqlbuilder.WhereClause, startMs, endMs, rBucket int64) (string, []any) {
	bounds := []string{
		"fromUnixTimestamp64Milli(toInt64(?)) AS t1_dt",
		"fromUnixTimestamp64Milli(toInt64(?)) AS t2_dt",
	}
	ctes, cteArgs := buildResourcePasses(tracesTables, filterClause, startMs, endMs, rBucket, bounds, []any{startMs, endMs})

	final := buildFinalSelect(
		tracesTables,
		"argMin((raw_traces.trace_id, raw_traces.span_id), raw_traces.timestamp) AS first_ids",
		"first_seen >= t1_dt AND first_seen <= t2_dt",
	)

	return querybuilder.CombineCTEs(ctes) + final, querybuilder.PrependArgs(cteArgs, nil)
}

func buildLogsDeploymentsQuery(filterClause *sqlbuilder.WhereClause, startMs, endMs, rBucket int64) (string, []any) {
	bounds := []string{
		"toUInt64(?) * 1000000 AS t1_ns",
		"toUInt64(?) * 1000000 AS t2_ns",
	}
	ctes, cteArgs := buildResourcePasses(logsTables, filterClause, startMs, endMs, rBucket, bounds, []any{startMs, endMs})

	final := buildFinalSelect(
		logsTables,
		"argMin(raw_logs.id, raw_logs.timestamp) AS first_id",
		"first_seen >= t1_ns AND first_seen <= t2_ns",
	)

	return querybuilder.CombineCTEs(ctes) + final, querybuilder.PrependArgs(cteArgs, nil)
}

// buildResourcePasses returns the constants, the signal's time bounds and the two resource-table CTEs shared by both signals, with their args in order.
func buildResourcePasses(tables signalTables, filterClause *sqlbuilder.WhereClause, startMs, endMs, rBucket int64, bounds []string, boundArgs []any) ([]string, [][]any) {
	constants := []string{
		"toInt64(intDiv(?, 1000)) AS t1",
		"toInt64(intDiv(?, 1000)) AS t2",
		fmt.Sprintf("toInt64(intDiv(t1, %d) * %d) AS bt1", resourceBucketSeconds, resourceBucketSeconds),
		"toInt64(?) AS r_bucket",
	}
	constants = append(constants, bounds...)
	constantArgs := append([]any{startMs, endMs, rBucket}, boundArgs...)

	resourceTable := fmt.Sprintf("%s.%s", tables.dbName, tables.resourceTable)

	firstBucketInner := sqlbuilder.NewSelectBuilder()
	firstBucketInner.Select(
		"simpleJSONExtractString(labels, 'service.name') AS service",
		"simpleJSONExtractString(labels, 'deployment.environment') AS env",
		"simpleJSONExtractString(labels, 'service.version') AS version",
		"seen_at_ts_bucket_start AS bucket",
	)
	firstBucketInner.From(resourceTable)
	firstBucketInner.Where("version != ''", "seen_at_ts_bucket_start <= t2")
	firstBucketInner.AddWhereClause(sqlbuilder.CopyWhereClause(filterClause))
	firstBucketInnerSQL, firstBucketArgs := firstBucketInner.BuildWithFlavor(sqlbuilder.ClickHouse)
	firstBucketSQL := fmt.Sprintf(
		"SELECT service, env, version, min(bucket) AS min_bucket FROM (%s) GROUP BY service, env, version HAVING min_bucket >= bt1 AND min_bucket > r_bucket",
		firstBucketInnerSQL,
	)

	cand := sqlbuilder.NewSelectBuilder()
	cand.Select(
		"simpleJSONExtractString(labels, 'service.name') AS service",
		"simpleJSONExtractString(labels, 'deployment.environment') AS env",
		"simpleJSONExtractString(labels, 'service.version') AS version",
		"seen_at_ts_bucket_start AS min_bucket",
		"fingerprint AS fp",
		"labels",
	)
	cand.From(resourceTable)
	cand.Where(
		"version != ''",
		"(service, env, version, seen_at_ts_bucket_start) GLOBAL IN (SELECT service, env, version, min_bucket FROM first_bucket)",
	)
	cand.AddWhereClause(sqlbuilder.CopyWhereClause(filterClause))
	candSQL, candArgs := cand.BuildWithFlavor(sqlbuilder.ClickHouse)

	ctes := make([]string, 0, len(constants)+2)
	ctes = append(ctes, constants...)
	ctes = append(ctes, fmt.Sprintf("first_bucket AS (%s)", firstBucketSQL), fmt.Sprintf("cand AS (%s)", candSQL))

	return ctes, [][]any{constantArgs, firstBucketArgs, candArgs}
}

// buildFinalSelect joins the raw table back to cand; idSelect and having carry the signal-specific columns and bounds.
func buildFinalSelect(tables signalTables, idSelect, having string) string {
	raw := tables.rawAlias
	return fmt.Sprintf(
		"SELECT cand.service, cand.env, cand.version, min(%s.timestamp) AS first_seen, %s, argMin(cand.labels, %s.timestamp) AS labels "+
			"FROM %s.%s AS %s "+
			"GLOBAL INNER JOIN cand ON %s.resource_fingerprint = cand.fp AND toInt64(%s.ts_bucket_start) = cand.min_bucket "+
			"WHERE (%s.ts_bucket_start, %s.resource_fingerprint) GLOBAL IN (SELECT toUInt64(min_bucket), fp FROM cand) "+
			"GROUP BY cand.service, cand.env, cand.version "+
			"HAVING %s "+
			"ORDER BY first_seen",
		raw, idSelect, raw,
		tables.dbName, tables.dataTable, raw,
		raw, raw,
		raw, raw,
		having,
	)
}

func buildHistoryEdgeQuery(tables signalTables) string {
	return fmt.Sprintf("SELECT min(seen_at_ts_bucket_start) FROM %s.%s", tables.dbName, tables.resourceTable)
}

func historyAvailableFromMs(rBucket int64) int64 {
	return (rBucket + resourceBucketSeconds) * 1000
}

// resolveSignals returns the requested signals, both when none were given.
func resolveSignals(req *annotationtypes.PostableAnnotations) []telemetrytypes.Signal {
	if len(req.Signals) == 0 {
		return []telemetrytypes.Signal{telemetrytypes.SignalTraces, telemetrytypes.SignalLogs}
	}
	return req.Signals
}
