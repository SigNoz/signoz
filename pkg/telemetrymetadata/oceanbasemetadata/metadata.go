package oceanbasemetadata

import (
	"context"
	"encoding/json"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	schema "github.com/SigNoz/signoz/pkg/telemetryschema/oceanbasetelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

type Store struct {
	store  telemetrystore.TelemetryStore
	config telemetrystore.OceanBaseConfig
}

var _ telemetrytypes.MetadataStore = (*Store)(nil)

func New(store telemetrystore.TelemetryStore, config telemetrystore.OceanBaseConfig) *Store {
	return &Store{store: store, config: config}
}

func (s *Store) selection(orgID valuer.UUID, selector *telemetrytypes.FieldKeySelector) (*sqlbuilder.SelectBuilder, error) {
	if orgID.IsZero() || selector == nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "organization and field selector are required")
	}
	if selector.Source != telemetrytypes.SourceUnspecified {
		return nil, telemetrystore.Unsupported("metadata source " + selector.Source.StringValue())
	}
	table, err := schema.Table(s.config.TablePrefix, selector.Signal)
	if err != nil {
		return nil, err
	}
	start, end := selector.StartUnixMilli, selector.EndUnixMilli
	if end == 0 {
		end = time.Now().UnixMilli()
	}
	if start == 0 {
		start = end - int64((6 * time.Hour).Milliseconds())
	}
	if start < 0 || start >= end || end > math.MaxInt64/1000000 || end-start > s.config.MaxQueryRange.Milliseconds() {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid metadata time range")
	}
	sb := sqlbuilder.NewSelectBuilder()
	sb.SetFlavor(sqlbuilder.MySQL)
	sb.From(table).Where(sb.E("org_id", orgID.StringValue()), sb.GE("timestamp", start*1000000), sb.L("timestamp", end*1000000))
	if selector.MetricContext != nil && selector.MetricContext.MetricName != "" {
		sb.Where(sb.E("metric_name", selector.MetricContext.MetricName))
	}
	return sb, nil
}

func (s *Store) GetKeys(ctx context.Context, orgID valuer.UUID, selector *telemetrytypes.FieldKeySelector) (map[string][]*telemetrytypes.TelemetryFieldKey, bool, error) {
	sb, err := s.selection(orgID, selector)
	if err != nil {
		return nil, false, err
	}
	// Bounded discovery over raw OTLP attribute maps, reporting incomplete when
	// the sample is exhausted. Never claim that sampling is a full catalog.
	const sampleLimit = 2000
	sb.Select("attributes", "resource_attributes").OrderBy("timestamp DESC").Limit(sampleLimit + 1)
	stmt, args := sb.Build()
	rows, err := s.store.QueryContext(ctx, stmt, args...)
	if err != nil {
		return nil, false, err
	}
	defer rows.Close()
	keys := map[string][]*telemetrytypes.TelemetryFieldKey{}
	seen := map[string]bool{}
	add := func(name string, context telemetrytypes.FieldContext, dataType telemetrytypes.FieldDataType) {
		key := &telemetrytypes.TelemetryFieldKey{Name: name, Signal: selector.Signal, FieldContext: context, FieldDataType: dataType}
		if !selector.MatchesKey(key) || seen[key.String()] {
			return
		}
		seen[key.String()] = true
		keys[name] = append(keys[name], key)
	}
	for name := range schema.StaticFields(selector.Signal) {
		add(name, telemetrytypes.FieldContextSpan, telemetrytypes.FieldDataTypeUnspecified)
	}
	count := 0
	complete := true
	for rows.Next() {
		count++
		if count > sampleLimit {
			complete = false
			break
		}
		var record, resource string
		if err := rows.Scan(&record, &resource); err != nil {
			return nil, false, err
		}
		for _, item := range []struct {
			raw     string
			context telemetrytypes.FieldContext
		}{{record, telemetrytypes.FieldContextAttribute}, {resource, telemetrytypes.FieldContextResource}} {
			var attrs map[string]any
			if err := json.Unmarshal([]byte(item.raw), &attrs); err != nil {
				return nil, false, errors.WrapInternalf(err, errors.CodeInternal, "invalid stored telemetry attributes")
			}
			for name, value := range attrs {
				dataType := telemetrytypes.FieldDataTypeString
				switch value.(type) {
				case bool:
					dataType = telemetrytypes.FieldDataTypeBool
				case float64:
					dataType = telemetrytypes.FieldDataTypeFloat64
				case map[string]any, []any, nil:
					continue
				}
				add(name, item.context, dataType)
			}
		}
	}
	if err := rows.Err(); err != nil {
		return nil, false, err
	}
	limit := selector.Limit
	if limit <= 0 {
		limit = 100
	}
	names := make([]string, 0, len(keys))
	for name := range keys {
		names = append(names, name)
	}
	sort.Strings(names)
	if len(names) > limit {
		complete = false
		for _, name := range names[limit:] {
			delete(keys, name)
		}
	}
	return keys, complete, nil
}

func (s *Store) GetKeysMulti(ctx context.Context, orgID valuer.UUID, selectors []*telemetrytypes.FieldKeySelector) (map[string][]*telemetrytypes.TelemetryFieldKey, bool, error) {
	all := map[string][]*telemetrytypes.TelemetryFieldKey{}
	seen := map[string]bool{}
	complete := true
	for _, selector := range selectors {
		keys, done, err := s.GetKeys(ctx, orgID, selector)
		if err != nil {
			return nil, false, err
		}
		complete = complete && done
		for name, values := range keys {
			for _, value := range values {
				if !seen[value.String()] {
					all[name] = append(all[name], value)
					seen[value.String()] = true
				}
			}
		}
	}
	return all, complete, nil
}

func (s *Store) GetKey(ctx context.Context, orgID valuer.UUID, selector *telemetrytypes.FieldKeySelector) ([]*telemetrytypes.TelemetryFieldKey, error) {
	keys, _, err := s.GetKeys(ctx, orgID, selector)
	if err != nil {
		return nil, err
	}
	return keys[selector.Name], nil
}

func (s *Store) GetAllValues(ctx context.Context, orgID valuer.UUID, selector *telemetrytypes.FieldValueSelector) (*telemetrytypes.TelemetryFieldValues, bool, error) {
	if selector == nil {
		return nil, false, errors.NewInvalidInputf(errors.CodeInvalidInput, "field selector is required")
	}
	sb, err := s.selection(orgID, selector.FieldKeySelector)
	if err != nil {
		return nil, false, err
	}
	field, err := schema.Field(selector.Signal, telemetrytypes.TelemetryFieldKey{Name: selector.Name, FieldContext: selector.FieldContext})
	if err != nil {
		return nil, false, err
	}
	if strings.TrimSpace(selector.ExistingQuery) != "" {
		where, err := querybuilder.PrepareWhereClause(selector.ExistingQuery, querybuilder.FilterExprVisitorOpts{
			Context: ctx, Builder: sb, Storage: schema.ConditionBuilder{Signal: selector.Signal},
			Query: qbtypes.QueryInfo{Signal: selector.Signal},
		})
		if err != nil {
			return nil, false, err
		}
		if where.IsEmpty() {
			return nil, false, errors.NewInvalidInputf(errors.CodeInvalidInput, "metadata filter produced no predicate")
		}
		sb.AddWhereClause(where.WhereClause)
	}
	sb.Select("DISTINCT CAST(" + field + " AS CHAR) AS value").Where(field + " IS NOT NULL").OrderBy("value")
	if selector.Value != "" {
		sb.Where("LOCATE(" + sb.Var(selector.Value) + ", " + field + ") > 0")
	}
	limit := selector.Limit
	if limit <= 0 {
		limit = 100
	}
	if limit > 1000 {
		limit = 1000
	}
	sb.Limit(limit + 1)
	stmt, args := sb.Build()
	rows, err := s.store.QueryContext(ctx, stmt, args...)
	if err != nil {
		return nil, false, err
	}
	defer rows.Close()
	values := &telemetrytypes.TelemetryFieldValues{StringValues: []string{}}
	scanned := 0
	for rows.Next() {
		scanned++
		if scanned > limit {
			return values, false, nil
		}
		var value string
		if err := rows.Scan(&value); err != nil {
			return nil, false, err
		}
		switch selector.FieldDataType {
		case telemetrytypes.FieldDataTypeBool:
			if parsed, err := strconv.ParseBool(value); err == nil {
				values.BoolValues = append(values.BoolValues, parsed)
			}
		case telemetrytypes.FieldDataTypeFloat64:
			if parsed, err := strconv.ParseFloat(value, 64); err == nil {
				values.NumberValues = append(values.NumberValues, parsed)
			}
		default:
			values.StringValues = append(values.StringValues, value)
		}
	}
	return values, true, rows.Err()
}

func (s *Store) GetRelatedValues(ctx context.Context, orgID valuer.UUID, selector *telemetrytypes.FieldValueSelector) ([]string, bool, error) {
	values, complete, err := s.GetAllValues(ctx, orgID, selector)
	if err != nil {
		return nil, false, err
	}
	return values.StringValues, complete, nil
}

func (s *Store) ListLogsJSONIndexes(context.Context, ...string) ([]telemetrytypes.TelemetryFieldKeySkipIndex, error) {
	return nil, telemetrystore.Unsupported("ClickHouse JSON indexes")
}
func (s *Store) GetPromotedPaths(context.Context, ...string) (map[string]bool, error) {
	return nil, telemetrystore.Unsupported("promoted JSON paths")
}
func (s *Store) PromotePaths(context.Context, ...string) error {
	return telemetrystore.Unsupported("promoting JSON paths")
}
func (s *Store) GetFirstSeenFromMetricMetadata(context.Context, []telemetrytypes.MetricMetadataLookupKey) (map[telemetrytypes.MetricMetadataLookupKey]int64, error) {
	return nil, telemetrystore.Unsupported("metric first-seen metadata")
}
func (s *Store) FetchLastSeenInfoMulti(context.Context, valuer.UUID, ...string) (map[string]int64, error) {
	return nil, telemetrystore.Unsupported("metric last-seen metadata")
}

func (s *Store) FetchTemporality(ctx context.Context, orgID valuer.UUID, start, end uint64, metric string) (metrictypes.Temporality, error) {
	values, err := s.FetchTemporalityMulti(ctx, orgID, start, end, metric)
	return values[metric], err
}

func (s *Store) FetchTemporalityMulti(ctx context.Context, orgID valuer.UUID, start, end uint64, metrics ...string) (map[string]metrictypes.Temporality, error) {
	values, _, _, err := s.FetchTemporalityAndTypeMulti(ctx, orgID, start, end, metrics...)
	return values, err
}

func (s *Store) FetchTemporalityAndTypeMulti(ctx context.Context, orgID valuer.UUID, start, end uint64, metrics ...string) (map[string]metrictypes.Temporality, map[string]metrictypes.Type, map[string]bool, error) {
	temporalities := map[string]metrictypes.Temporality{}
	types := map[string]metrictypes.Type{}
	reduced := map[string]bool{}
	if len(metrics) == 0 {
		return temporalities, types, reduced, nil
	}
	if start > math.MaxInt64 || end > math.MaxInt64 {
		return nil, nil, nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid metric time range")
	}
	sb, err := s.selection(orgID, &telemetrytypes.FieldKeySelector{Signal: telemetrytypes.SignalMetrics, StartUnixMilli: int64(start), EndUnixMilli: int64(end)})
	if err != nil {
		return nil, nil, nil, err
	}
	names := make([]any, len(metrics))
	for i, name := range metrics {
		names[i] = name
	}
	sb.Select("DISTINCT metric_name", "metric_type", "aggregation_temporality", "is_monotonic").Where(sb.In("metric_name", names...))
	stmt, args := sb.Build()
	rows, err := s.store.QueryContext(ctx, stmt, args...)
	if err != nil {
		return nil, nil, nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var name, typ, temp string
		var monotonic bool
		if err := rows.Scan(&name, &typ, &temp, &monotonic); err != nil {
			return nil, nil, nil, err
		}
		temporality := metrictypes.Temporality{String: valuer.NewString(strings.ToLower(temp))}
		if temp == "" || strings.EqualFold(temp, "unspecified") {
			temporality = metrictypes.Unspecified
		}
		metricType := metrictypes.Type{String: valuer.NewString(strings.ToLower(typ))}
		if metricType == metrictypes.SumType && !monotonic && temporality == metrictypes.Cumulative {
			metricType = metrictypes.GaugeType
		}
		if prev, ok := temporalities[name]; ok && prev != temporality {
			return nil, nil, nil, telemetrystore.Unsupported("mixed metric temporality for " + name)
		}
		if prev, ok := types[name]; ok && prev != metricType {
			return nil, nil, nil, telemetrystore.Unsupported("mixed metric types for " + name)
		}
		temporalities[name], types[name] = temporality, metricType
	}
	return temporalities, types, reduced, rows.Err()
}
