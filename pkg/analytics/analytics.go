package analytics

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/analyticstypes"
)

type Analytics interface {
	factory.Service

	// Sends analytics messages to an analytics backend.
	Send(context.Context, ...analyticstypes.Message)
}

type API interface {
	// func (aH *APIHandler) registerEvent(w http.ResponseWriter, r *http.Request) {
	// 	request, err := parseRegisterEventRequest(r)
	// 	if aH.HandleError(w, err, http.StatusBadRequest) {
	// 		return
	// 	}
	// 	claims, errv2 := authtypes.ClaimsFromContext(r.Context())
	// 	if errv2 == nil {
	// 		switch request.EventType {
	// 		case model.TrackEvent:
	// 			telemetry.GetInstance().SendEvent(request.EventName, request.Attributes, claims.Email, request.RateLimited, true)
	// 		case model.GroupEvent:
	// 			telemetry.GetInstance().SendGroupEvent(request.Attributes, claims.Email)
	// 		case model.IdentifyEvent:
	// 			telemetry.GetInstance().SendIdentifyEvent(request.Attributes, claims.Email)
	// 		}
	// 		aH.WriteJSON(w, r, map[string]string{"data": "Event Processed Successfully"})
	// 	} else {
	// 		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
	// 	}
	// }
}
