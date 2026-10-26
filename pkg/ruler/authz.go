package ruler

import (
	"context"

	"github.com/SigNoz/signoz/pkg/alertmanager"
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
