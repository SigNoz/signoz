package api

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	_ "github.com/kong/go-kong/kong"
	"go.signoz.io/signoz/ee/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/auth"
)

func (ah *APIHandler) getKeys(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	keys, err := ah.opts.AppDao.GetKeys(ctx)
	if err != nil {
		RespondError(w, err, nil)
		return
	}

	ah.Respond(w, &keys)
}

func (ah *APIHandler) deleteKey(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	id := mux.Vars(r)["id"]
	err := ah.opts.Gateway.DeleteKey(ctx, ah.opts.Name, id)
	if err != nil {
		RespondError(w, err, nil)
		return
	}

	err = ah.opts.AppDao.DeleteKey(ctx, id)
	if err != nil {
		RespondError(w, err, nil)
		return
	}

	ah.Respond(w, struct{}{})
}

func (ah *APIHandler) createKey(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req := model.CreateKeyReqModel{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	user, nerr := auth.GetUserFromRequest(r)
	if nerr != nil {
		RespondError(w, &model.ApiError{
			Typ: model.ErrorUnauthorized,
			Err: nerr,
		}, nil)
		return
	}

	id, value, err := ah.opts.Gateway.CreateKey(ctx, ah.opts.Name, req.ExpiresAt.Unix())
	if err != nil {
		RespondError(w, err, nil)
		return
	}

	key := &model.Key{
		Id:        id,
		Name:      req.Name,
		Value:     value,
		CreatedBy: user.Id,
		CreatedAt: time.Now().Unix(),
		ExpiresAt: req.ExpiresAt.Unix(),
	}

	err = ah.opts.AppDao.CreateKey(ctx, key)
	if err != nil {
		RespondError(w, err, nil)
		return
	}

	ah.Respond(w, key)
}
