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

// NewCreateChannelAttachExtractor resolves the channels a new rule names. The
// rule does not exist yet, so there is nothing to diff against.
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

// NewReplaceChannelAttachExtractor resolves the channels a full rule update adds.
func NewReplaceChannelAttachExtractor(alertmanagerService alertmanager.Alertmanager, rulerService ruler.Ruler) coretypes.ResourceIDsExtractor {
	return newChannelDiffExtractor(alertmanagerService, rulerService, replacedChannels, attachedSide)
}

// NewReplaceChannelDetachExtractor resolves the channels a full rule update drops.
func NewReplaceChannelDetachExtractor(alertmanagerService alertmanager.Alertmanager, rulerService ruler.Ruler) coretypes.ResourceIDsExtractor {
	return newChannelDiffExtractor(alertmanagerService, rulerService, replacedChannels, detachedSide)
}

// NewPatchChannelAttachExtractor resolves the channels a partial rule update adds.
func NewPatchChannelAttachExtractor(alertmanagerService alertmanager.Alertmanager, rulerService ruler.Ruler) coretypes.ResourceIDsExtractor {
	return newChannelDiffExtractor(alertmanagerService, rulerService, patchedChannels, attachedSide)
}

// NewPatchChannelDetachExtractor resolves the channels a partial rule update drops.
func NewPatchChannelDetachExtractor(alertmanagerService alertmanager.Alertmanager, rulerService ruler.Ruler) coretypes.ResourceIDsExtractor {
	return newChannelDiffExtractor(alertmanagerService, rulerService, patchedChannels, detachedSide)
}

const (
	attachedSide diffSide = iota
	detachedSide
)

type diffSide int

// incomingChannelsFunc returns the channel names the rule holds once the write
// lands, given the stored rule and the request body.
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

// replacedChannels mirrors EditRule, which overwrites the stored rule with the body.
func replacedChannels(_ *ruletypes.GettableRule, body []byte) ([]string, error) {
	return channelsFromBody(body)
}

// patchedChannels mirrors PatchRule, which unmarshals the body over the stored
// rule, so a body omitting the condition leaves the channels untouched. The
// round trip is what detaches the copy from the stored rule's nested pointers.
func patchedChannels(stored *ruletypes.GettableRule, body []byte) ([]string, error) {
	storedJSON, err := json.Marshal(stored.PostableRule)
	if err != nil {
		return nil, err
	}

	patched := new(ruletypes.PostableRule)
	if err := json.Unmarshal(storedJSON, patched); err != nil {
		return nil, err
	}

	if err := json.Unmarshal(body, patched); err != nil {
		return nil, err
	}

	return patched.Channels(), nil
}

func channelsFromBody(body []byte) ([]string, error) {
	rule := new(ruletypes.PostableRule)
	if err := json.Unmarshal(body, rule); err != nil {
		return nil, err
	}

	return rule.Channels(), nil
}

// resolveChannelIDs maps channel display names onto the ids authz objects are
// keyed by. Names with no channel are dropped; the handler rejects them anyway.
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
