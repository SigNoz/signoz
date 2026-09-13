package signozalertmanager

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

func (handler *handler) CreateNotificationChannel(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	postable := alertmanagertypes.PostableNotificationChannel{}
	if err := binding.JSON.BindBody(req.Body, &postable); err != nil {
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

func (handler *handler) ListNotificationChannels(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	params := new(alertmanagertypes.ListChannelsParams)
	if err := binding.Query.BindQuery(req.URL.Query(), params); err != nil {
		render.Error(rw, err)
		return
	}

	if err := params.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	// todo(@namanv3): use valuer.MustNewUUID(claims.OrgID) from here till the store method.
	listed, err := handler.alertmanager.ListNotificationChannels(ctx, claims.OrgID, params)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, listed)
}

func (handler *handler) GetNotificationChannel(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	id, err := valuer.NewUUID(mux.Vars(req)["id"])
	if err != nil {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "id is not a valid uuid-v7"))
		return
	}

	channel, err := handler.alertmanager.GetChannelByID(ctx, claims.OrgID, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	gettable, err := channel.ToGettableNotificationChannel()
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, gettable)
}

func (handler *handler) UpdateNotificationChannel(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	id, err := valuer.NewUUID(mux.Vars(req)["id"])
	if err != nil {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "id is not a valid uuid-v7"))
		return
	}

	updatable := alertmanagertypes.UpdatableNotificationChannel{}
	if err := binding.JSON.BindBody(req.Body, &updatable); err != nil {
		render.Error(rw, err)
		return
	}

	channel, err := handler.alertmanager.UpdateNotificationChannel(ctx, claims.OrgID, id, updatable)
	if err != nil {
		render.Error(rw, err)
		return
	}

	gettable, err := channel.ToGettableNotificationChannel()
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, gettable)
}

func (handler *handler) DeleteNotificationChannel(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	id, err := valuer.NewUUID(mux.Vars(req)["id"])
	if err != nil {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "id is not a valid uuid-v7"))
		return
	}

	if err := handler.alertmanager.DeleteChannelByID(ctx, claims.OrgID, id); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) TestNotificationChannel(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	testable := alertmanagertypes.TestableNotificationChannel{}
	if err := binding.JSON.BindBody(req.Body, &testable); err != nil {
		render.Error(rw, err)
		return
	}

	if err := handler.alertmanager.TestNotificationChannel(ctx, claims.OrgID, testable); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}
