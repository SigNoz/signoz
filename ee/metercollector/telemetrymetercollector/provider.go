// Package telemetrymetercollector collects telemetry meters (logs, traces, metrics)
// by retention. One Provider materializes per TelemetryConfig.
package telemetrymetercollector

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/huandu/go-sqlbuilder"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/metercollector"
	"github.com/SigNoz/signoz/pkg/modules/retention"
	"github.com/SigNoz/signoz/pkg/telemetrymeter"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/types/retentiontypes"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	labelKeyPattern   = regexp.MustCompile(`^[A-Za-z0-9_.\-]+$`)
	labelValuePattern = regexp.MustCompile(`^[A-Za-z0-9_.\-:]+$`)
)

var _ metercollector.MeterCollector = (*Provider)(nil)

type Provider struct {
	settings        factory.ScopedProviderSettings
	config          metercollector.TelemetryConfig
	telemetryStore  telemetrystore.TelemetryStore
	retentionGetter retention.Getter
}

func NewFactory(telemetryStore telemetrystore.TelemetryStore, retentionGetter retention.Getter) factory.ProviderFactory[metercollector.MeterCollector, metercollector.Config] {
	return factory.NewProviderFactory(factory.MustNewName(metercollector.ProviderTelemetry), func(ctx context.Context, providerSettings factory.ProviderSettings, config metercollector.Config) (metercollector.MeterCollector, error) {
		return newProvider(providerSettings, config.Telemetry, telemetryStore, retentionGetter), nil
	},
	)
}

func newProvider(
	providerSettings factory.ProviderSettings,
	config metercollector.TelemetryConfig,
	telemetryStore telemetrystore.TelemetryStore,
	retentionGetter retention.Getter,
) *Provider {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/ee/metercollector/telemetrymetercollector")

	return &Provider{
		settings:        settings,
		config:          config,
		telemetryStore:  telemetryStore,
		retentionGetter: retentionGetter,
	}
}

func (provider *Provider) Name() zeustypes.MeterName { return provider.config.Name }
func (provider *Provider) Unit() zeustypes.MeterUnit { return provider.config.Unit }
func (provider *Provider) Aggregation() zeustypes.MeterAggregation {
	return provider.config.Aggregation
}

func (provider *Provider) Origin(ctx context.Context, _ valuer.UUID, _ *licensetypes.License, todayStart time.Time) (time.Time, error) {
	query, args := buildOriginQuery(provider.config.Name.String())

	var minMs int64
	if err := provider.telemetryStore.ClickhouseDB().QueryRow(ctx, query, args...).Scan(&minMs); err != nil {
		return time.Time{}, err
	}
	if minMs == 0 {
		return todayStart, nil
	}

	minDay := time.UnixMilli(minMs).UTC()
	return time.Date(minDay.Year(), minDay.Month(), minDay.Day(), 0, 0, 0, 0, time.UTC), nil
}

func (provider *Provider) Collect(
	ctx context.Context,
	orgID valuer.UUID,
	_ *licensetypes.License,
	window zeustypes.MeterWindow,
) ([]zeustypes.Meter, error) {
	meterName := provider.config.Name.String()

	segments, err := provider.retentionGetter.GetRetentionPolicySegments(
		ctx,
		orgID,
		provider.config.DBName,
		provider.config.TableName,
		provider.config.DefaultRetentionDays,
		window.StartUnixMilli,
		window.EndUnixMilli,
	)
	if err != nil {
		return nil, err
	}

	valuesByRetentionDays := make(map[int]int64)

	for _, segment := range segments {
		query, args, err := buildQuery(meterName, segment)
		if err != nil {
			return nil, err
		}

		rows, err := provider.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
		if err != nil {
			return nil, err
		}

		if err := func() error {
			defer rows.Close()
			for rows.Next() {
				var retentionDays int32
				var value int64

				if err := rows.Scan(&retentionDays, &value); err != nil {
					return err
				}

				valuesByRetentionDays[int(retentionDays)] += value
			}
			if err := rows.Err(); err != nil {
				return err
			}
			return nil
		}(); err != nil {
			return nil, err
		}
	}

	meters := make([]zeustypes.Meter, 0, len(valuesByRetentionDays))
	for retentionDays, value := range valuesByRetentionDays {
		meters = append(meters, zeustypes.NewMeter(provider.config.Name, value, provider.config.Unit, provider.config.Aggregation, window, buildDimensions(orgID, retentionDays)))
	}

	// Empty windows still emit a sentinel so checkpoints can advance.
	if len(meters) == 0 && len(segments) > 0 {
		meters = append(meters, zeustypes.NewMeter(provider.config.Name, 0, provider.config.Unit, provider.config.Aggregation, window, buildDimensions(orgID, segments[len(segments)-1].DefaultDays)))
	}

	return meters, nil
}

func buildOriginQuery(meterName string) (string, []any) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("toInt64(ifNull(min(unix_milli), 0))")
	sb.From(telemetrymeter.DBName + "." + telemetrymeter.SamplesTableName)
	sb.Where(sb.Equal("metric_name", meterName))
	return sb.BuildWithFlavor(sqlbuilder.ClickHouse)
}

func buildQuery(meterName string, segment *retentiontypes.RetentionPolicySegment) (string, []any, error) {
	retentionExpr, err := buildRetentionMultiIfSQL(segment.Rules, segment.DefaultDays)
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
		sb.GTE("unix_milli", segment.StartMs),
		sb.LT("unix_milli", segment.EndMs),
	)
	sb.GroupBy("retention_days")
	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return query, args, nil
}

func buildRetentionMultiIfSQL(rules []retentiontypes.CustomRetentionRule, defaultDays int) (string, error) {
	if defaultDays <= 0 {
		return "", errors.Newf(errors.TypeInvalidInput, metercollector.ErrCodeMeterCollectorInvalidCustomRetentionRule, "non-positive default retention %d", defaultDays)
	}

	if len(rules) == 0 {
		return "toInt32(" + strconv.Itoa(defaultDays) + ")", nil
	}

	arms := make([]string, 0, 2*len(rules)+1)
	for ruleIndex, rule := range rules {
		if rule.TTLDays <= 0 {
			return "", errors.Newf(errors.TypeInvalidInput, metercollector.ErrCodeMeterCollectorInvalidCustomRetentionRule, "rule %d has non-positive ttl_days %d", ruleIndex, rule.TTLDays)
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
		return "", errors.Newf(errors.TypeInvalidInput, metercollector.ErrCodeMeterCollectorInvalidCustomRetentionRule, "rule %d has no filters", ruleIndex)
	}

	filterExprs := make([]string, 0, len(rule.Filters))
	for filterIndex, filter := range rule.Filters {
		if !labelKeyPattern.MatchString(filter.Key) {
			return "", errors.Newf(errors.TypeInvalidInput, metercollector.ErrCodeMeterCollectorInvalidCustomRetentionRule, "rule %d filter %d has invalid key %q", ruleIndex, filterIndex, filter.Key)
		}
		if len(filter.Values) == 0 {
			return "", errors.Newf(errors.TypeInvalidInput, metercollector.ErrCodeMeterCollectorInvalidCustomRetentionRule, "rule %d filter %d has no values", ruleIndex, filterIndex)
		}

		quoted := make([]string, len(filter.Values))
		for valueIndex, value := range filter.Values {
			if !labelValuePattern.MatchString(value) {
				return "", errors.Newf(errors.TypeInvalidInput, metercollector.ErrCodeMeterCollectorInvalidCustomRetentionRule, "rule %d filter %d value %d is invalid %q", ruleIndex, filterIndex, valueIndex, value)
			}
			quoted[valueIndex] = "'" + value + "'"
		}

		filterExprs = append(filterExprs, fmt.Sprintf("JSONExtractString(labels, '%s') IN (%s)", filter.Key, strings.Join(quoted, ", ")))
	}

	return strings.Join(filterExprs, " AND "), nil
}

func buildDimensions(orgID valuer.UUID, retentionDays int) map[string]string {
	retentionDurationSeconds := int64(retentionDays) * 24 * 60 * 60 // seconds

	return zeustypes.NewDimensions(
		zeustypes.OrganizationID.String(orgID.StringValue()),
		zeustypes.RetentionDuration.String(strconv.FormatInt(retentionDurationSeconds, 10)),
	)
}
