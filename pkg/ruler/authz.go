package ruler

import (
	"context"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
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

	return defaultToAllRules(ids), nil
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

		attached, detached := diffDowntimeRuleLinks(stored.RuleIDs, incoming)
		if side == detachedSide {
			return detached, nil
		}

		return attached, nil
	}}
}

func diffDowntimeRuleLinks(stored, incoming []string) (attached, detached []string) {
	return diffLinks(defaultToAllRules(stored), incoming)
}

func defaultToAllRules(ids []string) []string {
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

		names, err := coretypes.BodyJSONArray("channels").Fn(ec)
		if err != nil {
			return nil, err
		}

		return alertmanagerService.GetChannelIDsByNames(ctx, orgID.StringValue(), names)
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

		incoming, err := coretypes.BodyJSONArray("channels").Fn(ec)
		if err != nil {
			return nil, err
		}

		attached, detached := diffLinks(stored.Channels, incoming)
		if side == detachedSide {
			return alertmanagerService.GetChannelIDsByNames(ctx, orgID.StringValue(), detached)
		}

		return alertmanagerService.GetChannelIDsByNames(ctx, orgID.StringValue(), attached)
	}}
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
		body, err := fetchStoredCompositeQuery(ec, rulerService)
		if err != nil {
			return nil, err
		}

		return querybuilder.QueryRangeResources(coretypes.ExtractorContext{Request: ec.Request, RequestBody: body})
	}
}

func NewRuleQueryFieldResources(rulerService Ruler) coretypes.ResourceExtractor {
	return func(ec coretypes.ExtractorContext) ([]coretypes.ResourceWithID, error) {
		body, err := fetchStoredCompositeQuery(ec, rulerService)
		if err != nil {
			return nil, err
		}

		return mapFieldResources(body)
	}
}

func fetchStoredCompositeQuery(ec coretypes.ExtractorContext, rulerService Ruler) ([]byte, error) {
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

func mapFieldResources(body []byte) ([]coretypes.ResourceWithID, error) {
	telemetry, err := querybuilder.QueryRangeResources(coretypes.ExtractorContext{RequestBody: body})
	if err != nil {
		return nil, err
	}

	seen := make(map[string]struct{}, 3)
	refs := make([]coretypes.ResourceWithID, 0, 3)
	for _, ref := range telemetry {
		field, err := fieldResourceForKind(ref.Resource.Kind())
		if err != nil {
			return nil, err
		}

		kind := field.Kind().String()
		if _, ok := seen[kind]; ok {
			continue
		}
		seen[kind] = struct{}{}
		refs = append(refs, coretypes.ResourceWithID{Resource: field})
	}

	return refs, nil
}

func fieldResourceForKind(kind coretypes.Kind) (coretypes.Resource, error) {
	switch kind {
	case coretypes.KindLogs, coretypes.KindAuditLogs:
		return coretypes.ResourceMetaResourceLogsField, nil
	case coretypes.KindTraces:
		return coretypes.ResourceMetaResourceTracesField, nil
	case coretypes.KindMetrics, coretypes.KindMeterMetrics:
		return coretypes.ResourceMetaResourceMetricsField, nil
	default:
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "no field resource for telemetry kind %q", kind.String())
	}
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
