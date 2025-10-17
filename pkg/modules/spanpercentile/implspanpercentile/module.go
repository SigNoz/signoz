package implspanpercentile

import (
	"context"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/modules/preference"
	"github.com/SigNoz/signoz/pkg/modules/spanpercentile"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	preferencetypes "github.com/SigNoz/signoz/pkg/types/preferencetypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/spanpercentiletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	querier          querier.Querier
	preferenceModule preference.Module
}

func NewModule(querier querier.Querier, preferenceModule preference.Module) spanpercentile.Module {
	return &module{
		querier:          querier,
		preferenceModule: preferenceModule,
	}
}

func (m *module) GetSpanPercentileDetails(ctx context.Context, orgID valuer.UUID, req *spanpercentiletypes.SpanPercentileRequest) (*qbtypes.QueryRangeResponse, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	userID := valuer.UUID{}
	if err == nil {
		userID = valuer.MustNewUUID(claims.UserID)
	}

	// If additional resource attributes provided, save to user preferences
	if len(req.AdditionalResourceAttrs) > 0 && !userID.IsZero() {
		// Update preference asynchronously, don't fail the request if it fails
		_ = m.preferenceModule.UpdateByUser(
			ctx,
			userID,
			preferencetypes.NameSpanPercentileAdditionalResourceAttributes,
			req.AdditionalResourceAttrs,
		)
	} else if len(req.AdditionalResourceAttrs) == 0 {
		// No attributes provided, fetch from user preferences
		if !userID.IsZero() {
			pref, err := m.preferenceModule.GetByUser(
				ctx,
				userID,
				preferencetypes.NameSpanPercentileAdditionalResourceAttributes,
			)
			if err == nil && pref != nil {
				// Extract string array from preference value by marshaling and unmarshaling
				valueJSON, err := pref.Value.MarshalJSON()
				if err == nil {
					var attrs []string
					if err := json.Unmarshal(valueJSON, &attrs); err == nil {
						req.AdditionalResourceAttrs = attrs
					}
				}
			}
		}

		// Default fallback if still empty
		if len(req.AdditionalResourceAttrs) == 0 {
			req.AdditionalResourceAttrs = []string{"deployment.environment"}
		}
	}

	queryRangeRequest, err := buildSpanPercentileQuery(req)
	if err != nil {
		return nil, err
	}

	if err := queryRangeRequest.Validate(); err != nil {
		return nil, err
	}

	result, err := m.querier.QueryRange(ctx, orgID, queryRangeRequest)
	if err != nil {
		return nil, err
	}

	return result, nil
}
