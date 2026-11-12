package impllmpricingrule

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"maps"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/llmpricingrule"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/query-service/agentConf"
	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
	"github.com/SigNoz/signoz/pkg/types/llmpricingruletypes"
	"github.com/SigNoz/signoz/pkg/types/opamptypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// unmappedModelsLookback is the trace data window scanned to discover models in use.
const unmappedModelsLookback = time.Hour

type module struct {
	store                  llmpricingruletypes.Store
	querier                querier.Querier
	telemetryMetadataStore telemetrytypes.MetadataStore
	logger                 *slog.Logger
}

func NewModule(store llmpricingruletypes.Store, querier querier.Querier, telemetryMetadataStore telemetrytypes.MetadataStore, providerSettings factory.ProviderSettings) llmpricingrule.Module {
	return &module{store: store, querier: querier, telemetryMetadataStore: telemetryMetadataStore, logger: providerSettings.Logger}
}

func (module *module) List(ctx context.Context, orgID valuer.UUID, offset, limit int, search string, isOverride *bool) ([]*llmpricingruletypes.LLMPricingRule, int, error) {
	return module.store.List(ctx, orgID, offset, limit, search, isOverride)
}

func (module *module) Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*llmpricingruletypes.LLMPricingRule, error) {
	return module.store.Get(ctx, orgID, id)
}

// ListUnmappedModels discovers the models present in the last hour of trace data
// (gen_ai.request.model) and returns the ones that no enabled pricing rule matches.
// Disabled rules are excluded because they are not deployed to the collector, so
// they produce no estimated cost.
func (module *module) ListUnmappedModels(ctx context.Context, orgID valuer.UUID) ([]*llmpricingruletypes.UnmappedModel, error) {
	models, err := module.discoverModels(ctx, orgID)
	if err != nil {
		return nil, err
	}

	rules, err := module.getEnabledRules(ctx, orgID)
	if err != nil {
		return nil, err
	}

	return llmpricingruletypes.UnmappedModels(models, rules), nil
}

// Collect keeps the rule counts even when ClickHouse is unreachable: the
// counts that depend on it are skipped so the reporter retains their last value.
// Models come from the traces tag table rather than a span scan, so the
// unmapped count covers the metadata lookback instead of the last hour.
func (module *module) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	rules, err := module.listAllRules(ctx, orgID)
	if err != nil {
		return nil, err
	}
	stats := llmpricingruletypes.NewStatsFromRules(rules)

	selectors := aiobservabilitytypes.StatsFieldValueSelectors(time.Now())
	results := make([]*telemetrytypes.TelemetryFieldValues, len(selectors))
	var lookups sync.WaitGroup
	for i, selector := range selectors {
		lookups.Go(func() {
			fieldValues, _, err := module.telemetryMetadataStore.GetAllValues(ctx, orgID, selector)
			if err != nil {
				module.logger.DebugContext(ctx, "failed to collect gen_ai attribute stats", slog.String("key", selector.Name), errors.Attr(err))
				return
			}
			results[i] = fieldValues
		})
	}
	lookups.Wait()

	values := make(map[string]*telemetrytypes.TelemetryFieldValues, len(selectors))
	for i, selector := range selectors {
		if results[i] != nil {
			values[selector.Name] = results[i]
		}
	}
	maps.Copy(stats, aiobservabilitytypes.NewStatsFromFieldValues(values))
	if models := values[aiobservabilitytypes.GenAIRequestModel]; models != nil {
		maps.Copy(stats, llmpricingruletypes.NewStatsFromModels(models.StringValues, rules))
	}

	return stats, nil
}

// CreateOrUpdate saves a batch of pricing rules. isOverride decides how a rule
// is matched, see UpdatableLLMPricingRule. New rules are inserted on either path.
func (module *module) CreateOrUpdate(ctx context.Context, orgID valuer.UUID, userEmail string, rules []*llmpricingruletypes.UpdatableLLMPricingRule) error {
	now := time.Now()

	var byID, bySourceID []*llmpricingruletypes.LLMPricingRule
	for _, u := range rules {
		if u == nil {
			return errors.Newf(errors.TypeInvalidInput, llmpricingruletypes.ErrCodePricingRuleInvalidInput, "rule entry is null")
		}
		rule := llmpricingruletypes.NewLLMPricingRuleFromUpdatable(u, orgID, userEmail, now)
		if u.IsOverride == nil {
			bySourceID = append(bySourceID, rule)
		} else {
			byID = append(byID, rule)
		}
	}

	err := module.store.RunInTx(ctx, func(ctx context.Context) error {
		if err := module.store.UpsertByID(ctx, byID); err != nil {
			return err
		}
		return module.store.UpsertBySourceID(ctx, bySourceID)
	})
	if err != nil {
		return err
	}

	agentConf.NotifyConfigUpdate(ctx)
	return nil
}

func (module *module) Delete(ctx context.Context, orgID, id valuer.UUID) error {
	if err := module.store.Delete(ctx, orgID, id); err != nil {
		return err
	}

	agentConf.NotifyConfigUpdate(ctx)

	return nil
}

func (module *module) AgentFeatureType() agentConf.AgentFeatureType {
	return llmpricingruletypes.LLMCostFeatureType
}

// RecommendAgentConfig reads pricing rules and generates the
// signozllmpricing processor config for deployment to OTel collectors via OpAMP.
func (module *module) RecommendAgentConfig(orgID valuer.UUID, currentConfYaml []byte, configVersion *opamptypes.AgentConfigVersion) ([]byte, string, error) {
	ctx := context.Background()

	rules, err := module.getEnabledRules(ctx, orgID)
	if err != nil {
		return nil, "", err
	}

	updatedConf, err := llmpricingruletypes.GenerateCollectorConfigWithLLMPricingProcessor(currentConfYaml, rules)
	if err != nil {
		return nil, "", err
	}

	serialized, err := json.Marshal(rules)
	if err != nil {
		return nil, "", err
	}

	return updatedConf, string(serialized), nil
}

func (module *module) getEnabledRules(ctx context.Context, orgID valuer.UUID) ([]*llmpricingruletypes.LLMPricingRule, error) {
	rules, err := module.listAllRules(ctx, orgID)
	if err != nil {
		return nil, err
	}

	enabled := make([]*llmpricingruletypes.LLMPricingRule, 0, len(rules))
	for _, r := range rules {
		if r.Enabled {
			enabled = append(enabled, r)
		}
	}
	return enabled, nil
}

// listAllRules pages through every pricing rule for the org, since rule matching
// needs the full set and the count is otherwise unbounded.
func (module *module) listAllRules(ctx context.Context, orgID valuer.UUID) ([]*llmpricingruletypes.LLMPricingRule, error) {
	const pageSize = 1000

	all := make([]*llmpricingruletypes.LLMPricingRule, 0)
	for offset := 0; ; offset += pageSize {
		page, total, err := module.store.List(ctx, orgID, offset, pageSize, "", nil)
		if err != nil {
			return nil, err
		}
		all = append(all, page...)
		if len(page) == 0 || len(all) >= total {
			break
		}
	}
	return all, nil
}

// discoverModels runs a QBv5 traces aggregation grouped by gen_ai.request.model
// over the lookback window and returns each distinct model with its span count.
func (module *module) discoverModels(ctx context.Context, orgID valuer.UUID) ([]*llmpricingruletypes.UnmappedModel, error) {
	now := time.Now()
	req := &qbtypes.QueryRangeRequest{
		Start:       uint64(now.Add(-unmappedModelsLookback).UnixMilli()),
		End:         uint64(now.UnixMilli()),
		RequestType: qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalTraces,
						Filter: &qbtypes.Filter{Expression: fmt.Sprintf("%s EXISTS", aiobservabilitytypes.GenAIRequestModel)},
						Aggregations: []qbtypes.TraceAggregation{
							{Expression: "count()", Alias: "spanCount"},
						},
						GroupBy: []qbtypes.GroupByKey{
							{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name:          aiobservabilitytypes.GenAIRequestModel,
								FieldContext:  telemetrytypes.FieldContextSpan,
								FieldDataType: telemetrytypes.FieldDataTypeString,
							}},
							{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name:          aiobservabilitytypes.GenAIProviderName,
								FieldContext:  telemetrytypes.FieldContextSpan,
								FieldDataType: telemetrytypes.FieldDataTypeString,
							}},
						},
						Limit: 1000,
					},
				},
			},
		},
	}

	resp, err := module.querier.QueryRange(ctx, orgID, req)
	if err != nil {
		return nil, err
	}

	if resp == nil || len(resp.Data.Results) == 0 {
		return nil, nil
	}
	sd, ok := resp.Data.Results[0].(*qbtypes.ScalarData)
	if !ok || sd == nil {
		return nil, nil
	}

	modelIdx, providerIdx, countIdx := -1, -1, -1
	for i, c := range sd.Columns {
		switch c.Type {
		case qbtypes.ColumnTypeGroup:
			switch c.Name {
			case aiobservabilitytypes.GenAIRequestModel:
				modelIdx = i
			case aiobservabilitytypes.GenAIProviderName:
				providerIdx = i
			}
		case qbtypes.ColumnTypeAggregation:
			countIdx = i
		}
	}
	if modelIdx == -1 {
		return nil, nil
	}

	models := make([]*llmpricingruletypes.UnmappedModel, 0, len(sd.Data))
	for _, row := range sd.Data {
		name, _ := row[modelIdx].(string)
		if name == "" {
			continue
		}
		provider := ""
		if providerIdx != -1 {
			provider, _ = row[providerIdx].(string)
		}
		var spanCount uint64
		if countIdx >= 0 && countIdx < len(row) {
			spanCount, _ = row[countIdx].(uint64)
		}
		models = append(models, &llmpricingruletypes.UnmappedModel{ModelName: name, Provider: provider, SpanCount: spanCount})
	}
	return models, nil
}
