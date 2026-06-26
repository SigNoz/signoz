package implsession

import (
	"context"
	"net/http"
	"net/url"
	"path"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/global"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/session"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type handler struct {
	module       session.Module
	globalConfig global.Config
	stateSecret  string
}

func NewHandler(module session.Module, globalConfig global.Config) session.Handler {
	return &handler{module: module, globalConfig: globalConfig, stateSecret: globalConfig.StateSecret()}
}

func (handler *handler) GetSessionContext(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
	defer cancel()

	email, err := valuer.NewEmail(req.URL.Query().Get("email"))
	if err != nil {
		render.Error(rw, err)
		return
	}

	ref := req.URL.Query().Get("ref")
	siteURL, err := url.Parse(ref)
	if err != nil {
		render.Error(rw, err)
		return
	}

	if err := handler.validateRedirectURL(siteURL); err != nil {
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

func (handler *handler) getRedirectURLFromErr(err error) string {
	values := errors.AsURLValues(err)
	values.Add("callbackauthnerr", "true")

	return (&url.URL{
		// When UI is being served on a prefix, we need to redirect to the login page on the prefix.
		Path:     path.Join(handler.globalConfig.ExternalPath(), "/login"),
		RawQuery: values.Encode(),
	}).String()
}

func (handler *handler) validateRedirectURL(u *url.URL) error {
	allowedOrigins := handler.globalConfig.AllowedRedirectOrigins()

	if len(allowedOrigins) == 0 {
		return errors.New(errors.TypeForbidden, errors.CodeForbidden, "redirect origins not configured")
	}

	redirectOrigin := u.Scheme + "://" + u.Host
	for _, allowed := range allowedOrigins {
		if redirectOrigin == allowed {
			return nil
		}
	}

	return errors.Newf(errors.TypeForbidden, errors.CodeForbidden, "redirect origin %q not allowed", redirectOrigin)
}
