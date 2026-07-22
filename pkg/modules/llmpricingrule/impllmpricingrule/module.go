package impllmpricingrule

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/modules/llmpricingrule"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/query-service/agentConf"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/types/llmpricingruletypes"
	"github.com/SigNoz/signoz/pkg/types/opamptypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// unmappedModelsLookback is the trace data window scanned to discover models in use.
const unmappedModelsLookback = time.Hour

type module struct {
	store   llmpricingruletypes.Store
	querier querier.Querier
	flagger flagger.Flagger
}

func NewModule(store llmpricingruletypes.Store, flagger flagger.Flagger, querier querier.Querier) llmpricingrule.Module {
	return &module{store: store, flagger: flagger, querier: querier}
}

func (module *module) List(ctx context.Context, orgID valuer.UUID, offset, limit int, search string, isOverride *bool) ([]*llmpricingruletypes.LLMPricingRule, int, error) {
	return module.store.List(ctx, orgID, offset, limit, search, isOverride)
}

func (module *module) Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*llmpricingruletypes.LLMPricingRule, error) {
	return module.store.Get(ctx, orgID, id)
}

// ListUnmappedModels discovers the models present in the last hour of trace data
// (gen_ai.request.model) and returns the ones that no pricing rule pattern matches.
func (module *module) ListUnmappedModels(ctx context.Context, orgID valuer.UUID) ([]*llmpricingruletypes.UnmappedModel, error) {
	models, err := module.discoverModels(ctx, orgID)
	if err != nil {
		return nil, err
	}

	rules, err := module.listAllRules(ctx, orgID)
	if err != nil {
		return nil, err
	}

	unmapped := make([]*llmpricingruletypes.UnmappedModel, 0, len(models))
	for _, m := range models {
		if !llmpricingruletypes.ModelMatchesAnyRule(m.ModelName, rules) {
			unmapped = append(unmapped, m)
		}
	}
	return unmapped, nil
}

// CreateOrUpdate applies a batch of pricing rule changes:
//   - ID set       → match by id, overwrite fields.
//   - SourceID set → match by source_id; if found overwrite, else insert.
//   - neither set  → insert a new user-created row (is_override = true).
//
// When UpdatableLLMPricingRule.IsOverride is nil AND the matched row has
// is_override = true, the row is fully preserved — only synced_at is stamped.
func (module *module) CreateOrUpdate(ctx context.Context, orgID valuer.UUID, userEmail string, rules []*llmpricingruletypes.UpdatableLLMPricingRule) error {
	now := time.Now()

	upsert := func(ctx context.Context, u *llmpricingruletypes.UpdatableLLMPricingRule) error {
		if u == nil {
			return errors.Newf(errors.TypeInvalidInput, llmpricingruletypes.ErrCodePricingRuleInvalidInput, "rule entry is null")
		}
		existing, err := module.findExisting(ctx, orgID, u)
		if err != nil && errors.Ast(err, errors.TypeNotFound) {
			return module.store.Create(ctx, llmpricingruletypes.NewLLMPricingRuleFromUpdatable(u, orgID, userEmail, now))
		}
		if err != nil {
			return err
		}
		existing.Update(u, userEmail, now)
		return module.store.Update(ctx, existing)
	}

	err := module.store.RunInTx(ctx, func(ctx context.Context) error {
		for _, u := range rules {
			if err := upsert(ctx, u); err != nil {
				return err
			}
		}
		return nil
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

	// Skip the llm pricing processor unless AI observability is enabled for the org.
	evalCtx := featuretypes.NewFlaggerEvaluationContext(orgID)
	enabled, err := module.flagger.Boolean(ctx, flagger.FeatureEnableAIObservability, evalCtx)
	if err != nil {
		return nil, "", err
	}
	if !enabled {
		return currentConfYaml, "", nil
	}

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

// findExisting returns the row matching the updatable's ID or SourceID.
// Returns a TypeNotFound error when neither matches; the caller treats that
// as "insert new".
func (module *module) findExisting(ctx context.Context, orgID valuer.UUID, u *llmpricingruletypes.UpdatableLLMPricingRule) (*llmpricingruletypes.LLMPricingRule, error) {
	switch {
	case u.ID != nil:
		return module.store.Get(ctx, orgID, *u.ID)
	case u.SourceID != nil:
		return module.store.GetBySourceID(ctx, orgID, *u.SourceID)
	default:
		return nil, errors.Newf(errors.TypeNotFound, llmpricingruletypes.ErrCodePricingRuleNotFound, "rule has neither id nor sourceId")
	}
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
						Filter: &qbtypes.Filter{Expression: fmt.Sprintf("%s EXISTS", llmpricingruletypes.GenAIRequestModel)},
						Aggregations: []qbtypes.TraceAggregation{
							{Expression: "count()", Alias: "spanCount"},
						},
						GroupBy: []qbtypes.GroupByKey{
							{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name:          llmpricingruletypes.GenAIRequestModel,
								FieldContext:  telemetrytypes.FieldContextSpan,
								FieldDataType: telemetrytypes.FieldDataTypeString,
							}},
							{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name:          llmpricingruletypes.GenAIProviderName,
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
			case llmpricingruletypes.GenAIRequestModel:
				modelIdx = i
			case llmpricingruletypes.GenAIProviderName:
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
