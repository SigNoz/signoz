package signozalertmanager

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

func (handler *handler) CreateNotificationChannel(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	postable := new(alertmanagertypes.PostableNotificationChannel)
	if err := binding.JSON.BindBody(req.Body, postable); err != nil {
		render.Error(rw, err)
		return
	}

	channel, err := handler.alertmanager.CreateNotificationChannel(ctx, claims.OrgID, postable)
	if err != nil {
		render.Error(rw, err)
		return
	}

	gettable, err := channel.ToGettableNotificationChannel()
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, gettable)
}
