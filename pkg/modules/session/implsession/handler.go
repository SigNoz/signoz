package implsession

import (
	"context"
	"net/http"
	"net/url"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/session"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
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

	email, err := valuer.NewEmail(req.URL.Query().Get("email"))
	if err != nil {
		render.Error(rw, err)
		return
	}

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

func (handler *handler) DeprecatedCreateSessionByEmailPassword(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 15*time.Second)
	defer cancel()

	body := new(authtypes.DeprecatedPostableLogin)
	if err := binding.JSON.BindBody(req.Body, body); err != nil {
		render.Error(rw, err)
		return
	}

	token, err := handler.module.DeprecatedCreateSessionByEmailPassword(ctx, body.Email, body.Password)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, &authtypes.DeprecatedGettableLogin{
		AccessJWT: token.AccessToken,
		UserID:    token.UserID.String(),
	})
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

	render.Success(rw, http.StatusOK, authtypes.NewGettableTokenFromToken(token, handler.module.GetRotationInterval(ctx)))
}

func (handler *handler) CreateSessionByGoogleCallback(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 15*time.Second)
	defer cancel()

	values := req.URL.Query()

	redirectURL, err := handler.module.CreateCallbackAuthNSession(ctx, authtypes.AuthNProviderGoogleAuth, values)
	if err != nil {
		http.Redirect(rw, req, handler.getRedirectURLFromErr(err), http.StatusSeeOther)
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
		http.Redirect(rw, req, handler.getRedirectURLFromErr(err), http.StatusSeeOther)
		return
	}

	http.Redirect(rw, req, redirectURL, http.StatusSeeOther)
}

func (handler *handler) CreateSessionByOIDCCallback(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 15*time.Second)
	defer cancel()

	values := req.URL.Query()
	redirectURL, err := handler.module.CreateCallbackAuthNSession(ctx, authtypes.AuthNProviderOIDC, values)
	if err != nil {
		http.Redirect(rw, req, handler.getRedirectURLFromErr(err), http.StatusSeeOther)
		return
	}

	http.Redirect(rw, req, redirectURL, http.StatusSeeOther)
}

func (handler *handler) RotateSession(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
	defer cancel()

	body := new(authtypes.PostableRotateToken)
	if err := binding.JSON.BindBody(req.Body, body); err != nil {
		render.Error(rw, err)
		return
	}

	accessToken, err := authtypes.AccessTokenFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	token, err := handler.module.RotateSession(ctx, accessToken, body.RefreshToken)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, authtypes.NewGettableTokenFromToken(token, handler.module.GetRotationInterval(ctx)))
}

func (handler *handler) DeleteSession(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
	defer cancel()

	accessToken, err := authtypes.AccessTokenFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.module.DeleteSession(ctx, accessToken)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (*handler) getRedirectURLFromErr(err error) string {
	values := errors.AsURLValues(err)
	values.Add("callbackauthnerr", "true")

	return (&url.URL{
		// When UI is being served on a prefix, we need to redirect to the login page on the prefix.
		Path:     "/login",
		RawQuery: values.Encode(),
	}).String()
}
