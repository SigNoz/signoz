// Package datapointsizemetercollector collects metric datapoint size meters
// by retention. Keep the query local to this meter.
package datapointsizemetercollector

import (
	"context"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/huandu/go-sqlbuilder"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/metercollector"
	"github.com/SigNoz/signoz/pkg/modules/retention"
	"github.com/SigNoz/signoz/pkg/telemetrymeter"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/retentiontypes"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// MeterName is the typed registry key for this collector.
var (
	MeterName        = zeustypes.MustNewMeterName("signoz.meter.metric.datapoint.size")
	meterUnit        = zeustypes.MeterUnitBytes
	meterAggregation = zeustypes.MeterAggregationSum
)

var (
	labelKeyPattern   = regexp.MustCompile(`^[A-Za-z0-9_.\-]+$`)
	labelValuePattern = regexp.MustCompile(`^[A-Za-z0-9_.\-:]+$`)
)

var _ metercollector.MeterCollector = (*Provider)(nil)

// Provider collects datapoint size meters.
type Provider struct {
	telemetryStore  telemetrystore.TelemetryStore
	retentionGetter retention.Getter
}

func New(telemetryStore telemetrystore.TelemetryStore, retentionGetter retention.Getter) *Provider {
	return &Provider{
		telemetryStore:  telemetryStore,
		retentionGetter: retentionGetter,
	}
}

func (p *Provider) Name() zeustypes.MeterName { return MeterName }
func (p *Provider) Unit() zeustypes.MeterUnit { return meterUnit }
func (p *Provider) Aggregation() zeustypes.MeterAggregation {
	return meterAggregation
}

// Collect aggregates datapoint size for the window and emits an empty-day sentinel.
func (p *Provider) Collect(ctx context.Context, orgID valuer.UUID, window zeustypes.MeterWindow) ([]zeustypes.Meter, error) {
	meterName := MeterName.String()

	slices, err := p.retentionGetter.ActiveSlices(
		ctx,
		orgID,
		telemetrymetrics.DBName,
		telemetrymetrics.SamplesV4LocalTableName,
		retentiontypes.DefaultMetricsRetentionDays,
		window.StartUnixMilli,
		window.EndUnixMilli,
	)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, zeustypes.ErrCodeMeterCollectFailed, "load retention slices for meter %q", meterName)
	}

	type bucket struct {
		dimensions map[string]string
		value      int64
	}
	accumulator := make(map[string]*bucket)

	for _, slice := range slices {
		query, args, err := buildQuery(meterName, slice)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, zeustypes.ErrCodeMeterCollectFailed, "build retention query for meter %q", meterName)
		}

		rows, err := p.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, zeustypes.ErrCodeMeterCollectFailed, "query meter %q slice [%d, %d)", meterName, slice.StartMs, slice.EndMs)
		}

		if err := func() error {
			defer rows.Close()
			for rows.Next() {
				var retentionDays int32
				var value int64

				if err := rows.Scan(&retentionDays, &value); err != nil {
					return errors.Wrapf(err, errors.TypeInternal, zeustypes.ErrCodeMeterCollectFailed, "scan meter %q slice [%d, %d)", meterName, slice.StartMs, slice.EndMs)
				}

				dimensions := buildDimensions(orgID, int(retentionDays))
				key := bucketKey(dimensions)
				b, ok := accumulator[key]
				if !ok {
					b = &bucket{dimensions: dimensions}
					accumulator[key] = b
				}
				b.value += value
			}
			if err := rows.Err(); err != nil {
				return errors.Wrapf(err, errors.TypeInternal, zeustypes.ErrCodeMeterCollectFailed, "iterate meter %q slice [%d, %d)", meterName, slice.StartMs, slice.EndMs)
			}
			return nil
		}(); err != nil {
			return nil, err
		}
	}

	meters := make([]zeustypes.Meter, 0, len(accumulator))
	for _, b := range accumulator {
		meters = append(meters, zeustypes.NewMeter(MeterName, b.value, meterUnit, meterAggregation, window, b.dimensions))
	}

	// Empty windows still emit a sentinel so checkpoints can advance.
	if len(meters) == 0 && len(slices) > 0 {
		meters = append(meters, zeustypes.NewMeter(MeterName, 0, meterUnit, meterAggregation, window, map[string]string{
			zeustypes.MeterDimensionOrganizationID:    orgID.StringValue(),
			zeustypes.MeterDimensionRetentionDuration: strconv.Itoa(slices[len(slices)-1].DefaultDays),
		}))
	}

	return meters, nil
}

// buildQuery stays local because each meter owns its billing query.
func buildQuery(meterName string, slice retentiontypes.Slice) (string, []any, error) {
	retentionExpr, err := buildRetentionMultiIfSQL(slice.Rules, slice.DefaultDays)
	if err != nil {
		return "", nil, err
	}

	selects := []string{
		retentionExpr + " AS retention_days",
		"toInt64(ifNull(sum(value), 0)) AS value",
	}

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(selects...)
	sb.From(telemetrymeter.DBName + "." + telemetrymeter.SamplesTableName)
	sb.Where(
		sb.Equal("metric_name", meterName),
		sb.GTE("unix_milli", slice.StartMs),
		sb.LT("unix_milli", slice.EndMs),
	)
	sb.GroupBy("retention_days")
	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return query, args, nil
}

func buildRetentionMultiIfSQL(rules []retentiontypes.CustomRetentionRule, defaultDays int) (string, error) {
	if defaultDays <= 0 {
		return "", errors.Newf(errors.TypeInvalidInput, zeustypes.ErrCodeMeterCollectFailed, "non-positive default retention %d", defaultDays)
	}

	if len(rules) == 0 {
		return "toInt32(" + strconv.Itoa(defaultDays) + ")", nil
	}

	arms := make([]string, 0, 2*len(rules)+1)
	for ruleIndex, rule := range rules {
		if rule.TTLDays <= 0 {
			return "", errors.Newf(errors.TypeInternal, zeustypes.ErrCodeMeterCollectFailed, "rule %d has non-positive ttl_days %d", ruleIndex, rule.TTLDays)
		}
		conditionExpr, err := buildRuleConditionSQL(ruleIndex, rule)
		if err != nil {
			return "", err
		}

		arms = append(arms, conditionExpr)
		arms = append(arms, strconv.Itoa(rule.TTLDays))
	}
	arms = append(arms, strconv.Itoa(defaultDays))

	return "toInt32(multiIf(" + strings.Join(arms, ", ") + "))", nil
}

func buildRuleConditionSQL(ruleIndex int, rule retentiontypes.CustomRetentionRule) (string, error) {
	if len(rule.Filters) == 0 {
		return "", errors.Newf(errors.TypeInternal, zeustypes.ErrCodeMeterCollectFailed, "rule %d has no filters", ruleIndex)
	}

	filterExprs := make([]string, 0, len(rule.Filters))
	for filterIndex, filter := range rule.Filters {
		if !labelKeyPattern.MatchString(filter.Key) {
			return "", errors.Newf(errors.TypeInternal, zeustypes.ErrCodeMeterCollectFailed, "rule %d filter %d has invalid key %q", ruleIndex, filterIndex, filter.Key)
		}
		if len(filter.Values) == 0 {
			return "", errors.Newf(errors.TypeInternal, zeustypes.ErrCodeMeterCollectFailed, "rule %d filter %d has no values", ruleIndex, filterIndex)
		}

		quoted := make([]string, len(filter.Values))
		for valueIndex, value := range filter.Values {
			if !labelValuePattern.MatchString(value) {
				return "", errors.Newf(errors.TypeInternal, zeustypes.ErrCodeMeterCollectFailed, "rule %d filter %d value %d is invalid %q", ruleIndex, filterIndex, valueIndex, value)
			}
			quoted[valueIndex] = "'" + value + "'"
		}

		filterExprs = append(filterExprs, fmt.Sprintf("JSONExtractString(labels, '%s') IN (%s)", filter.Key, strings.Join(quoted, ", ")))
	}

	return strings.Join(filterExprs, " AND "), nil
}

func buildDimensions(orgID valuer.UUID, retentionDays int) map[string]string {
	return map[string]string{
		zeustypes.MeterDimensionOrganizationID:    orgID.StringValue(),
		zeustypes.MeterDimensionRetentionDuration: strconv.Itoa(retentionDays),
	}
}

func bucketKey(dimensions map[string]string) string {
	keys := make([]string, 0, len(dimensions))
	for key := range dimensions {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	var b strings.Builder
	for _, key := range keys {
		value := dimensions[key]
		b.WriteString(strconv.Itoa(len(key)))
		b.WriteByte(':')
		b.WriteString(key)
		b.WriteByte('=')
		b.WriteString(strconv.Itoa(len(value)))
		b.WriteByte(':')
		b.WriteString(value)
		b.WriteByte(';')
	}
	return b.String()
}
