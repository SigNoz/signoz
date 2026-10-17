package ruler

import (
	"context"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

func NewCreateChannelAttachExtractor(alertmanagerService alertmanager.Alertmanager) coretypes.ResourceIDsExtractor {
	return coretypes.ResourceIDsExtractor{Phase: coretypes.PhaseRequest, Fn: func(ec coretypes.ExtractorContext) ([]string, error) {
		if ec.Request == nil {
			return nil, nil
		}

		ctx := ec.Request.Context()
		orgID, err := orgIDFromContext(ctx)
		if err != nil {
			return nil, err
		}

		names, err := channelsFromBody(ec.RequestBody)
		if err != nil {
			return nil, err
		}

		return resolveChannelIDs(ctx, alertmanagerService, orgID, names)
	}}
}

func NewCloneChannelAttachExtractor(alertmanagerService alertmanager.Alertmanager, rulerService Ruler) coretypes.ResourceIDsExtractor {
	return coretypes.ResourceIDsExtractor{Phase: coretypes.PhaseRequest, Fn: func(ec coretypes.ExtractorContext) ([]string, error) {
		if ec.Request == nil {
			return nil, nil
		}

		ctx := ec.Request.Context()
		orgID, err := orgIDFromContext(ctx)
		if err != nil {
			return nil, err
		}

		ruleID, err := valuer.NewUUID(mux.Vars(ec.Request)["id"])
		if err != nil {
			return nil, err
		}

		stored, err := rulerService.GetRule(ctx, ruleID)
		if err != nil {
			return nil, err
		}

		return resolveChannelIDs(ctx, alertmanagerService, orgID, stored.Channels())
	}}
}

func NewReplaceChannelAttachExtractor(alertmanagerService alertmanager.Alertmanager, rulerService Ruler) coretypes.ResourceIDsExtractor {
	return newChannelDiffExtractor(alertmanagerService, rulerService, replacedChannels, attachedSide)
}

func NewReplaceChannelDetachExtractor(alertmanagerService alertmanager.Alertmanager, rulerService Ruler) coretypes.ResourceIDsExtractor {
	return newChannelDiffExtractor(alertmanagerService, rulerService, replacedChannels, detachedSide)
}

func NewPatchChannelAttachExtractor(alertmanagerService alertmanager.Alertmanager, rulerService Ruler) coretypes.ResourceIDsExtractor {
	return newChannelDiffExtractor(alertmanagerService, rulerService, patchedChannels, attachedSide)
}

func NewPatchChannelDetachExtractor(alertmanagerService alertmanager.Alertmanager, rulerService Ruler) coretypes.ResourceIDsExtractor {
	return newChannelDiffExtractor(alertmanagerService, rulerService, patchedChannels, detachedSide)
}

const (
	attachedSide diffSide = iota
	detachedSide
)

type diffSide int

type incomingChannelsFunc func(stored *ruletypes.GettableRule, body []byte) ([]string, error)

func newChannelDiffExtractor(alertmanagerService alertmanager.Alertmanager, rulerService Ruler, incoming incomingChannelsFunc, side diffSide) coretypes.ResourceIDsExtractor {
	return coretypes.ResourceIDsExtractor{Phase: coretypes.PhaseRequest, Fn: func(ec coretypes.ExtractorContext) ([]string, error) {
		if ec.Request == nil {
			return nil, nil
		}

		ctx := ec.Request.Context()
		orgID, err := orgIDFromContext(ctx)
		if err != nil {
			return nil, err
		}

		ruleID, err := valuer.NewUUID(mux.Vars(ec.Request)["id"])
		if err != nil {
			return nil, err
		}

		stored, err := rulerService.GetRule(ctx, ruleID)
		if err != nil {
			return nil, err
		}

		storedNames := stored.Channels()
		incomingNames, err := incoming(stored, ec.RequestBody)
		if err != nil {
			return nil, err
		}

		attached, detached := diffLinks(storedNames, incomingNames)
		if side == detachedSide {
			return resolveChannelIDs(ctx, alertmanagerService, orgID, detached)
		}

		return resolveChannelIDs(ctx, alertmanagerService, orgID, attached)
	}}
}

func replacedChannels(_ *ruletypes.GettableRule, body []byte) ([]string, error) {
	return channelsFromBody(body)
}

func patchedChannels(stored *ruletypes.GettableRule, body []byte) ([]string, error) {
	patched, err := clonePostableRule(stored.PostableRule)
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal(body, patched); err != nil {
		return nil, err
	}

	return patched.Channels(), nil
}

func clonePostableRule(rule ruletypes.PostableRule) (*ruletypes.PostableRule, error) {
	encoded, err := json.Marshal(rule)
	if err != nil {
		return nil, err
	}

	clone := new(ruletypes.PostableRule)
	if err := json.Unmarshal(encoded, clone); err != nil {
		return nil, err
	}

	return clone, nil
}

func channelsFromBody(body []byte) ([]string, error) {
	rule := new(ruletypes.PostableRule)
	if err := json.Unmarshal(body, rule); err != nil {
		return nil, err
	}

	return rule.Channels(), nil
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
		if id, ok := idByName[name]; ok {
			ids = append(ids, id)
		}
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

var DowntimeRuleIDsExtractor = coretypes.BodyJSONArray("alertIds")

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

		attached, detached := diffLinks(stored.RuleIDs, incoming)
		if side == detachedSide {
			return detached, nil
		}

		return attached, nil
	}}
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
