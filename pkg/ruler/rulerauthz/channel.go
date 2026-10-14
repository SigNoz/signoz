package rulerauthz

import (
	"context"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/ruler"
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

func NewReplaceChannelAttachExtractor(alertmanagerService alertmanager.Alertmanager, rulerService ruler.Ruler) coretypes.ResourceIDsExtractor {
	return newChannelDiffExtractor(alertmanagerService, rulerService, replacedChannels, attachedSide)
}

func NewReplaceChannelDetachExtractor(alertmanagerService alertmanager.Alertmanager, rulerService ruler.Ruler) coretypes.ResourceIDsExtractor {
	return newChannelDiffExtractor(alertmanagerService, rulerService, replacedChannels, detachedSide)
}

func NewPatchChannelAttachExtractor(alertmanagerService alertmanager.Alertmanager, rulerService ruler.Ruler) coretypes.ResourceIDsExtractor {
	return newChannelDiffExtractor(alertmanagerService, rulerService, patchedChannels, attachedSide)
}

func NewPatchChannelDetachExtractor(alertmanagerService alertmanager.Alertmanager, rulerService ruler.Ruler) coretypes.ResourceIDsExtractor {
	return newChannelDiffExtractor(alertmanagerService, rulerService, patchedChannels, detachedSide)
}

const (
	attachedSide diffSide = iota
	detachedSide
)

type diffSide int

type incomingChannelsFunc func(stored *ruletypes.GettableRule, body []byte) ([]string, error)

func newChannelDiffExtractor(alertmanagerService alertmanager.Alertmanager, rulerService ruler.Ruler, incoming incomingChannelsFunc, side diffSide) coretypes.ResourceIDsExtractor {
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

		attached, detached := coretypes.DiffLinks(storedNames, incomingNames)
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
