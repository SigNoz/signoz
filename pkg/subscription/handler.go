package subscription

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/subscriptiontypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type handler struct {
	subscription Subscription
}

func NewHandler(subscription Subscription) Handler {
	return &handler{subscription: subscription}
}

func (handler *handler) Create(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(subscriptiontypes.PostableSubscription)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	gettableSubscription, err := handler.subscription.Create(ctx, valuer.MustNewUUID(claims.OrgID), req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, gettableSubscription)
}

func (handler *handler) Update(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(subscriptiontypes.PostableSubscription)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	gettableSubscription, err := handler.subscription.Update(ctx, valuer.MustNewUUID(claims.OrgID), req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, gettableSubscription)
}

func (handler *handler) Get(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	usage, err := handler.subscription.Get(ctx, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, usage)
}
