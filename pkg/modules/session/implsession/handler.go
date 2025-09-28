package implsession

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/session"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

type handler struct {
	module session.Module
}

func NewHandler(module session.Module) session.Handler {
	return &handler{module: module}
}

func (handler *handler) GetSessionContext(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
	defer cancel()

	email := req.URL.Query().Get("email")

	siteURL, err := url.Parse(req.URL.Query().Get("ref"))
	if err != nil {
		render.Error(rw, err)
		return
	}

	sessionContext, err := handler.module.GetSessionContext(ctx, email, siteURL)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, sessionContext)
}

func (handler *handler) CreateSessionByEmailPassword(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 15*time.Second)
	defer cancel()

	body := new(authtypes.PostableEmailPasswordSession)
	if err := binding.JSON.BindBody(req.Body, body); err != nil {
		render.Error(rw, err)
		return
	}

	token, err := handler.module.CreatePasswordAuthNSession(ctx, authtypes.AuthNProviderEmailPassword, body.Email, body.Password, body.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, authtypes.NewGettableTokenFromToken(token))
}

func (handler *handler) CreateSessionByGoogleCallback(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 15*time.Second)
	defer cancel()

	values := req.URL.Query()

	redirectURL, err := handler.module.CreateCallbackAuthNSession(ctx, authtypes.AuthNProviderGoogle, values)
	if err != nil {
		t, c, m, _, _, _ := errors.Unwrapb(err)
		http.Redirect(rw, req, fmt.Sprintf("/ssoerror?type=%s&code=%s&message=%s", t, c.String(), m), http.StatusSeeOther)
		return
	}

	http.Redirect(rw, req, redirectURL, http.StatusSeeOther)
}

func (handler *handler) CreateSessionBySAMLCallback(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 15*time.Second)
	defer cancel()

	err := req.ParseForm()
	if err != nil {
		render.Error(rw, err)
		return
	}

	redirectURL, err := handler.module.CreateCallbackAuthNSession(ctx, authtypes.AuthNProviderSAML, req.Form)
	if err != nil {
		t, c, m, _, _, _ := errors.Unwrapb(err)
		http.Redirect(rw, req, fmt.Sprintf("/ssoerror?type=%s&code=%s&message=%s", t, c.String(), m), http.StatusSeeOther)
		return
	}

	http.Redirect(rw, req, redirectURL, http.StatusSeeOther)
}
