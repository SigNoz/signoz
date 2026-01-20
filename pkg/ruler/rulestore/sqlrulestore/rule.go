package sqlrulestore

import (
	"context"
	"encoding/json"
	"log/slog"
	"slices"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type rule struct {
	sqlstore    sqlstore.SQLStore
	queryParser queryparser.QueryParser
	logger      *slog.Logger
}

func NewRuleStore(store sqlstore.SQLStore, queryParser queryparser.QueryParser, providerSettings factory.ProviderSettings) ruletypes.RuleStore {
	return &rule{
		sqlstore:    store,
		queryParser: queryParser,
		logger:      providerSettings.Logger,
	}
}

func (r *rule) CreateRule(ctx context.Context, storedRule *ruletypes.Rule, cb func(context.Context, valuer.UUID) error) (valuer.UUID, error) {
	err := r.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		_, err := r.sqlstore.
			BunDBCtx(ctx).
			NewInsert().
			Model(storedRule).
			Exec(ctx)
		if err != nil {
			return err
		}

		return cb(ctx, storedRule.ID)
	})

	if err != nil {
		return valuer.UUID{}, err
	}

	return storedRule.ID, nil
}

func (r *rule) EditRule(ctx context.Context, storedRule *ruletypes.Rule, cb func(context.Context) error) error {
	return r.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		_, err := r.sqlstore.
			BunDBCtx(ctx).
			NewUpdate().
			Model(storedRule).
			Where("id = ?", storedRule.ID.StringValue()).
			Exec(ctx)
		if err != nil {
			return err
		}

		return cb(ctx)
	})
}

func (r *rule) DeleteRule(ctx context.Context, id valuer.UUID, cb func(context.Context) error) error {
	if err := r.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		_, err := r.sqlstore.
			BunDBCtx(ctx).
			NewDelete().
			Model(new(ruletypes.Rule)).
			Where("id = ?", id.StringValue()).
			Exec(ctx)
		if err != nil {
			return err
		}

		return cb(ctx)
	}); err != nil {
		return err
	}

	return nil
}

func (r *rule) GetStoredRules(ctx context.Context, orgID string) ([]*ruletypes.Rule, error) {
	rules := make([]*ruletypes.Rule, 0)
	err := r.sqlstore.
		BunDB().
		NewSelect().
		Model(&rules).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return rules, err
	}

	return rules, nil
}

func (r *rule) GetStoredRule(ctx context.Context, id valuer.UUID) (*ruletypes.Rule, error) {
	rule := new(ruletypes.Rule)
	err := r.sqlstore.
		BunDB().
		NewSelect().
		Model(rule).
		Where("id = ?", id.StringValue()).
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return rule, nil
}

func (r *rule) GetStoredRulesByMetricName(ctx context.Context, orgID string, metricName string) ([]ruletypes.RuleAlert, error) {
	if metricName == "" {
		return []ruletypes.RuleAlert{}, nil
	}

	// Get all stored rules for the organization
	storedRules, err := r.GetStoredRules(ctx, orgID)
	if err != nil {
		return nil, err
	}

	alerts := make([]ruletypes.RuleAlert, 0)
	seen := make(map[string]bool)

	for _, storedRule := range storedRules {
		var ruleData ruletypes.PostableRule
		if err := json.Unmarshal([]byte(storedRule.Data), &ruleData); err != nil {
			r.logger.WarnContext(ctx, "failed to unmarshal rule data", "rule_id", storedRule.ID.StringValue(), "error", err)
			continue
		}

		// Check conditions: must be metric-based alert with valid composite query
		if ruleData.AlertType != ruletypes.AlertTypeMetric ||
			ruleData.RuleCondition == nil ||
			ruleData.RuleCondition.CompositeQuery == nil {
			continue
		}

		// Search for metricName in the Queries array (v5 format only)
		// TODO check if we need to support v3 query format structs
		found := false
		for _, queryEnvelope := range ruleData.RuleCondition.CompositeQuery.Queries {
			// Check based on query type
			switch queryEnvelope.Type {
			case qbtypes.QueryTypeBuilder:
				// Cast to QueryBuilderQuery[MetricAggregation] for metrics
				if spec, ok := queryEnvelope.Spec.(qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]); ok {
					// Check if signal is metrics
					if spec.Signal == telemetrytypes.SignalMetrics {
						for _, agg := range spec.Aggregations {
							if agg.MetricName == metricName {
								found = true
								break
							}
						}
					}
				}
			case qbtypes.QueryTypePromQL:
				if spec, ok := queryEnvelope.Spec.(qbtypes.PromQuery); ok {
					result, err := r.queryParser.AnalyzeQueryFilter(ctx, qbtypes.QueryTypePromQL, spec.Query)
					if err != nil {
						r.logger.WarnContext(ctx, "failed to parse PromQL query", "query", spec.Query, "error", err)
						continue
					}
					if slices.Contains(result.MetricNames, metricName) {
						found = true
						break
					}
				}
			case qbtypes.QueryTypeClickHouseSQL:
				if spec, ok := queryEnvelope.Spec.(qbtypes.ClickHouseQuery); ok {
					result, err := r.queryParser.AnalyzeQueryFilter(ctx, qbtypes.QueryTypeClickHouseSQL, spec.Query)
					if err != nil {
						r.logger.WarnContext(ctx, "failed to parse ClickHouse query", "query", spec.Query, "error", err)
						continue
					}
					if slices.Contains(result.MetricNames, metricName) {
						found = true
						break
					}
				}
			}
			if found {
				break
			}
		}

		if found && !seen[storedRule.ID.StringValue()] {
			seen[storedRule.ID.StringValue()] = true
			alerts = append(alerts, ruletypes.RuleAlert{
				AlertName: ruleData.AlertName,
				AlertID:   storedRule.ID.StringValue(),
			})
		}
	}

	return alerts, nil
}
