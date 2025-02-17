package alertmanager

import (
	"context"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"go.signoz.io/signoz/pkg/errors"
	"go.signoz.io/signoz/pkg/http/render"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
	"go.signoz.io/signoz/pkg/types/authtypes"
)

type API struct {
	configStore  alertmanagertypes.ConfigStore
	alertmanager Alertmanager
}

func NewAPI(configStore alertmanagertypes.ConfigStore, alertmanager Alertmanager) *API {
	return &API{
		configStore:  configStore,
		alertmanager: alertmanager,
	}
}

func (api *API) GetAlerts(req *http.Request, rw http.ResponseWriter) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		render.Error(rw, errors.Newf(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "unauthenticated"))
		return
	}

	params, err := alertmanagertypes.NewGettableAlertsParams(req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	alerts, err := api.alertmanager.GetAlerts(ctx, claims.OrgID, params)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, alerts)
}

func (api *API) TestReceiver(req *http.Request, rw http.ResponseWriter) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		render.Error(rw, errors.Newf(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "unauthenticated"))
		return
	}

	body, err := io.ReadAll(req.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}
	defer req.Body.Close() //nolint:errcheck

	receiver, err := alertmanagertypes.NewReceiver(string(body))
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = api.alertmanager.TestReceiver(ctx, claims.OrgID, receiver)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (api *API) GetChannels(req *http.Request, rw http.ResponseWriter) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		render.Error(rw, errors.Newf(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "unauthenticated"))
		return
	}

	config, err := api.configStore.Get(ctx, claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	channels := config.Channels()

	channelList := make([]*alertmanagertypes.Channel, 0, len(channels))
	for _, channel := range channels {
		channelList = append(channelList, channel)
	}

	render.Success(rw, http.StatusOK, channelList)
}

func (api *API) GetChannelByID(req *http.Request, rw http.ResponseWriter) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		render.Error(rw, errors.Newf(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "unauthenticated"))
		return
	}

	vars := mux.Vars(req)
	if vars == nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is required in path"))
		return
	}

	idString, ok := vars["id"]
	if !ok {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is required in path"))
		return
	}

	id, err := strconv.Atoi(idString)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is not a valid integer"))
		return
	}

	config, err := api.configStore.Get(ctx, claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	channels := config.Channels()
	channel, err := alertmanagertypes.GetChannelByID(channels, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, channel)
}

func (api *API) UpdateChannelByID(req *http.Request, rw http.ResponseWriter) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		render.Error(rw, errors.Newf(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "unauthenticated"))
		return
	}

	body, err := io.ReadAll(req.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}
	defer req.Body.Close() //nolint:errcheck

	receiver, err := alertmanagertypes.NewReceiver(string(body))
	if err != nil {
		render.Error(rw, err)
		return
	}

	config, err := api.configStore.Get(ctx, claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = config.UpdateReceiver(alertmanagertypes.NewRouteFromReceiver(receiver), receiver)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = api.configStore.Set(ctx, config)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (api *API) DeleteChannelByID(req *http.Request, rw http.ResponseWriter) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		render.Error(rw, errors.Newf(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "unauthenticated"))
		return
	}

	vars := mux.Vars(req)
	if vars == nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is required in path"))
		return
	}

	idString, ok := vars["id"]
	if !ok {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is required in path"))
		return
	}

	id, err := strconv.Atoi(idString)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is not a valid integer"))
		return
	}

	config, err := api.configStore.Get(ctx, claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	channels := config.Channels()
	channel, err := alertmanagertypes.GetChannelByID(channels, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = config.DeleteReceiver(channel.Name)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = api.configStore.Set(ctx, config)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}
