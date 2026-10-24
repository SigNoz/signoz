package ruler

import (
	"context"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
	"github.com/tidwall/gjson"
)

const (
	attachedSide diffSide = iota
	detachedSide
)

type diffSide int

var DowntimeRuleIDsExtractor = coretypes.ResourceIDsExtractor{Phase: coretypes.PhaseRequest, Fn: func(ec coretypes.ExtractorContext) ([]string, error) {
	ids, err := coretypes.BodyJSONArray("alertIds").Fn(ec)
	if err != nil {
		return nil, err
	}

	return allRulesWhenEmpty(ids), nil
}}

var DowntimeRuleSelector coretypes.SelectorFunc = func(ctx context.Context, resource coretypes.Resource, id string, orgID valuer.UUID) ([]coretypes.Selector, error) {
	if id == coretypes.WildCardSelectorString {
		return coretypes.WildcardSelector(ctx, resource, id, orgID)
	}

	return coretypes.IDSelector(ctx, resource, id, orgID)
}

func NewDowntimeRuleAttachExtractor(rulerService Ruler) coretypes.ResourceIDsExtractor {
	return newDowntimeDiffExtractor(rulerService, attachedSide)
}

func NewDowntimeRuleDetachExtractor(rulerService Ruler) coretypes.ResourceIDsExtractor {
	return newDowntimeDiffExtractor(rulerService, detachedSide)
}

func newDowntimeDiffExtractor(rulerService Ruler, side diffSide) coretypes.ResourceIDsExtractor {
	return coretypes.ResourceIDsExtractor{Phase: coretypes.PhaseRequest, Fn: func(ec coretypes.ExtractorContext) ([]string, error) {
		if ec.Request == nil {
			return nil, nil
		}

		scheduleID, err := valuer.NewUUID(mux.Vars(ec.Request)["id"])
		if err != nil {
			return nil, err
		}

		stored, err := rulerService.MaintenanceStore().GetPlannedMaintenanceByID(ec.Request.Context(), scheduleID)
		if err != nil {
			return nil, err
		}

		incoming, err := DowntimeRuleIDsExtractor.Fn(ec)
		if err != nil {
			return nil, err
		}

		attached, detached := downtimeRuleLinks(stored.RuleIDs, incoming)
		if side == detachedSide {
			return detached, nil
		}

		return attached, nil
	}}
}

func downtimeRuleLinks(stored, incoming []string) (attached, detached []string) {
	return diffLinks(allRulesWhenEmpty(stored), allRulesWhenEmpty(incoming))
}

func allRulesWhenEmpty(ids []string) []string {
	if len(ids) == 0 {
		return []string{coretypes.WildCardSelectorString}
	}

	return ids
}

func NewCreateRoutePolicyChannelAttachExtractor(alertmanagerService alertmanager.Alertmanager) coretypes.ResourceIDsExtractor {
	return coretypes.ResourceIDsExtractor{Phase: coretypes.PhaseRequest, Fn: func(ec coretypes.ExtractorContext) ([]string, error) {
		if ec.Request == nil {
			return nil, nil
		}

		ctx := ec.Request.Context()
		orgID, err := orgIDFromContext(ctx)
		if err != nil {
			return nil, err
		}

		names, err := routePolicyChannelsFromBody(ec.RequestBody)
		if err != nil {
			return nil, err
		}

		return resolveChannelIDs(ctx, alertmanagerService, orgID, names)
	}}
}

func NewUpdateRoutePolicyChannelAttachExtractor(alertmanagerService alertmanager.Alertmanager) coretypes.ResourceIDsExtractor {
	return newRoutePolicyDiffExtractor(alertmanagerService, attachedSide)
}

func NewUpdateRoutePolicyChannelDetachExtractor(alertmanagerService alertmanager.Alertmanager) coretypes.ResourceIDsExtractor {
	return newRoutePolicyDiffExtractor(alertmanagerService, detachedSide)
}

func newRoutePolicyDiffExtractor(alertmanagerService alertmanager.Alertmanager, side diffSide) coretypes.ResourceIDsExtractor {
	return coretypes.ResourceIDsExtractor{Phase: coretypes.PhaseRequest, Fn: func(ec coretypes.ExtractorContext) ([]string, error) {
		if ec.Request == nil {
			return nil, nil
		}

		ctx := ec.Request.Context()
		orgID, err := orgIDFromContext(ctx)
		if err != nil {
			return nil, err
		}

		stored, err := alertmanagerService.GetRoutePolicyByID(ctx, mux.Vars(ec.Request)["id"])
		if err != nil {
			return nil, err
		}

		incoming, err := routePolicyChannelsFromBody(ec.RequestBody)
		if err != nil {
			return nil, err
		}

		attached, detached := diffLinks(stored.Channels, incoming)
		if side == detachedSide {
			return resolveChannelIDs(ctx, alertmanagerService, orgID, detached)
		}

		return resolveChannelIDs(ctx, alertmanagerService, orgID, attached)
	}}
}

func routePolicyChannelsFromBody(body []byte) ([]string, error) {
	policy := new(alertmanagertypes.PostableRoutePolicy)
	if err := json.Unmarshal(body, policy); err != nil {
		return nil, err
	}

	return policy.Channels, nil
}

func resolveChannelIDs(ctx context.Context, alertmanagerService alertmanager.Alertmanager, orgID valuer.UUID, names []string) ([]string, error) {
	if len(names) == 0 {
		return nil, nil
	}

	channels, err := alertmanagerService.ListChannels(ctx, orgID.StringValue())
	if err != nil {
		return nil, err
	}

	idByName := make(map[string]string, len(channels))
	for _, channel := range channels {
		idByName[channel.DisplayName] = channel.ID.StringValue()
	}

	ids := make([]string, 0, len(names))
	for _, name := range names {
		id, ok := idByName[name]
		if !ok {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "notification channel %q does not exist", name)
		}
		ids = append(ids, id)
	}

	return ids, nil
}

func orgIDFromContext(ctx context.Context) (valuer.UUID, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return valuer.UUID{}, err
	}

	return valuer.NewUUID(claims.OrgID)
}

func NewRuleQueryTelemetryResources(rulerService Ruler) coretypes.ResourceExtractor {
	return func(ec coretypes.ExtractorContext) ([]coretypes.ResourceWithID, error) {
		body, err := storedCompositeQuery(ec, rulerService)
		if err != nil {
			return nil, err
		}

		return querybuilder.QueryRangeResources(coretypes.ExtractorContext{Request: ec.Request, RequestBody: body})
	}
}

func NewRuleQueryFieldResources(rulerService Ruler) coretypes.ResourceExtractor {
	return func(ec coretypes.ExtractorContext) ([]coretypes.ResourceWithID, error) {
		body, err := storedCompositeQuery(ec, rulerService)
		if err != nil {
			return nil, err
		}

		return fieldResourcesFromCompositeQuery(body)
	}
}

func storedCompositeQuery(ec coretypes.ExtractorContext, rulerService Ruler) ([]byte, error) {
	if ec.Request == nil {
		return nil, nil
	}

	ruleID, err := valuer.NewUUID(mux.Vars(ec.Request)["id"])
	if err != nil {
		return nil, err
	}

	stored, err := rulerService.GetRule(ec.Request.Context(), ruleID)
	if err != nil {
		return nil, err
	}

	return json.Marshal(map[string]any{"compositeQuery": stored.RuleCondition.CompositeQuery})
}

func fieldResourcesFromCompositeQuery(body []byte) ([]coretypes.ResourceWithID, error) {
	queries := gjson.GetBytes(body, "compositeQuery.queries")
	if !queries.IsArray() || len(queries.Array()) == 0 {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "atleast one query is required")
	}

	seen := make(map[string]struct{}, 3)
	refs := make([]coretypes.ResourceWithID, 0, 3)
	add := func(resources ...coretypes.Resource) {
		for _, resource := range resources {
			kind := resource.Kind().String()
			if _, ok := seen[kind]; ok {
				continue
			}
			seen[kind] = struct{}{}
			refs = append(refs, coretypes.ResourceWithID{Resource: resource})
		}
	}

	for _, query := range queries.Array() {
		queryType := query.Get("type").String()
		switch queryType {
		case qbtypes.QueryTypeBuilder.StringValue(), qbtypes.QueryTypeSubQuery.StringValue():
			signal := query.Get("spec.signal").String()
			switch signal {
			case telemetrytypes.SignalLogs.StringValue():
				add(coretypes.ResourceMetaResourceLogsField)
			case telemetrytypes.SignalTraces.StringValue():
				add(coretypes.ResourceMetaResourceTracesField)
			case telemetrytypes.SignalMetrics.StringValue():
				add(coretypes.ResourceMetaResourceMetricsField)
			default:
				return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported signal %q", signal)
			}
		case qbtypes.QueryTypeBuilderAI.StringValue():
			add(coretypes.ResourceMetaResourceTracesField)
		case qbtypes.QueryTypePromQL.StringValue():
			add(coretypes.ResourceMetaResourceMetricsField)
		case qbtypes.QueryTypeClickHouseSQL.StringValue():
			add(coretypes.ResourceMetaResourceLogsField, coretypes.ResourceMetaResourceTracesField, coretypes.ResourceMetaResourceMetricsField)
		case qbtypes.QueryTypeFormula.StringValue(), qbtypes.QueryTypeJoin.StringValue(), qbtypes.QueryTypeTraceOperator.StringValue():
			continue
		default:
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported query type %q", queryType)
		}
	}

	return refs, nil
}

func diffLinks(stored, incoming []string) (attached, detached []string) {
	storedSet := make(map[string]struct{}, len(stored))
	for _, id := range stored {
		storedSet[id] = struct{}{}
	}

	incomingSet := make(map[string]struct{}, len(incoming))
	for _, id := range incoming {
		incomingSet[id] = struct{}{}
	}

	seen := make(map[string]struct{}, len(incoming))
	attached = make([]string, 0, len(incoming))
	for _, id := range incoming {
		if _, ok := storedSet[id]; ok {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		attached = append(attached, id)
	}

	clear(seen)
	detached = make([]string, 0, len(stored))
	for _, id := range stored {
		if _, ok := incomingSet[id]; ok {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		detached = append(detached, id)
	}

	return attached, detached
}
