package api

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"go.uber.org/zap"

	"github.com/SigNoz/signoz/ee/query-service/constants"
	"github.com/SigNoz/signoz/ee/query-service/model"
	"github.com/SigNoz/signoz/pkg/http/render"
)

func parseRequest(r *http.Request, req interface{}) error {
	defer r.Body.Close()
	requestBody, err := io.ReadAll(r.Body)
	if err != nil {
		return err
	}

	err = json.Unmarshal(requestBody, &req)
	return err
}

// loginUser overrides base handler and considers SSO case.
func (ah *APIHandler) loginUser(w http.ResponseWriter, r *http.Request) {
	r, err := ah.updateRequestContext(w, r)
	if err != nil {
		render.Error(w, err)
		return
	}
	ah.Signoz.Handlers.User.Login(w, r)
	return
}

func handleSsoError(w http.ResponseWriter, r *http.Request, redirectURL string) {
	ssoError := []byte("Login failed. Please contact your system administrator")
	dst := make([]byte, base64.StdEncoding.EncodedLen(len(ssoError)))
	base64.StdEncoding.Encode(dst, ssoError)

	http.Redirect(w, r, fmt.Sprintf("%s?ssoerror=%s", redirectURL, string(dst)), http.StatusSeeOther)
}

// receiveGoogleAuth completes google OAuth response and forwards a request
// to front-end to sign user in
func (ah *APIHandler) receiveGoogleAuth(w http.ResponseWriter, r *http.Request) {
	redirectUri := constants.GetDefaultSiteURL()
	ctx := context.Background()

	if !ah.CheckFeature(model.SSO) {
		zap.L().Error("[receiveGoogleAuth] sso requested but feature unavailable in org domain")
		http.Redirect(w, r, fmt.Sprintf("%s?ssoerror=%s", redirectUri, "feature unavailable, please upgrade your billing plan to access this feature"), http.StatusMovedPermanently)
		return
	}

	q := r.URL.Query()
	if errType := q.Get("error"); errType != "" {
		zap.L().Error("[receiveGoogleAuth] failed to login with google auth", zap.String("error", errType), zap.String("error_description", q.Get("error_description")))
		http.Redirect(w, r, fmt.Sprintf("%s?ssoerror=%s", redirectUri, "failed to login through SSO "), http.StatusMovedPermanently)
		return
	}

	relayState := q.Get("state")
	zap.L().Debug("[receiveGoogleAuth] relay state received", zap.String("state", relayState))

	parsedState, err := url.Parse(relayState)
	if err != nil || relayState == "" {
		zap.L().Error("[receiveGoogleAuth] failed to process response - invalid response from IDP", zap.Error(err), zap.Any("request", r))
		handleSsoError(w, r, redirectUri)
		return
	}

	// upgrade redirect url from the relay state for better accuracy
	redirectUri = fmt.Sprintf("%s://%s%s", parsedState.Scheme, parsedState.Host, "/login")

	// fetch domain by parsing relay state.
	domain, err := ah.AppDao().GetDomainFromSsoResponse(ctx, parsedState)
	if err != nil {
		handleSsoError(w, r, redirectUri)
		return
	}

	// now that we have domain, use domain to fetch sso settings.
	// prepare google callback handler using parsedState -
	// which contains redirect URL (front-end endpoint)
	callbackHandler, err := domain.PrepareGoogleOAuthProvider(parsedState)
	if err != nil {
		zap.L().Error("[receiveGoogleAuth] failed to prepare google oauth provider", zap.String("domain", domain.String()), zap.Error(err))
		handleSsoError(w, r, redirectUri)
		return
	}

	identity, err := callbackHandler.HandleCallback(r)
	if err != nil {
		zap.L().Error("[receiveGoogleAuth] failed to process HandleCallback ", zap.String("domain", domain.String()), zap.Error(err))
		handleSsoError(w, r, redirectUri)
		return
	}

	nextPage, err := ah.Signoz.Modules.User.PrepareSsoRedirect(ctx, redirectUri, identity.Email, ah.opts.JWT)
	if err != nil {
		zap.L().Error("[receiveGoogleAuth] failed to generate redirect URI after successful login ", zap.String("domain", domain.String()), zap.Error(err))
		handleSsoError(w, r, redirectUri)
		return
	}

	http.Redirect(w, r, nextPage, http.StatusSeeOther)
}

// receiveSAML completes a SAML request and gets user logged in
func (ah *APIHandler) receiveSAML(w http.ResponseWriter, r *http.Request) {
	// this is the source url that initiated the login request
	redirectUri := constants.GetDefaultSiteURL()
	ctx := context.Background()

	if !ah.CheckFeature(model.SSO) {
		zap.L().Error("[receiveSAML] sso requested but feature unavailable in org domain")
		http.Redirect(w, r, fmt.Sprintf("%s?ssoerror=%s", redirectUri, "feature unavailable, please upgrade your billing plan to access this feature"), http.StatusMovedPermanently)
		return
	}

	err := r.ParseForm()
	if err != nil {
		zap.L().Error("[receiveSAML] failed to process response - invalid response from IDP", zap.Error(err), zap.Any("request", r))
		handleSsoError(w, r, redirectUri)
		return
	}

	// the relay state is sent when a login request is submitted to
	// Idp.
	relayState := r.FormValue("RelayState")
	zap.L().Debug("[receiveML] relay state", zap.String("relayState", relayState))

	parsedState, err := url.Parse(relayState)
	if err != nil || relayState == "" {
		zap.L().Error("[receiveSAML] failed to process response - invalid response from IDP", zap.Error(err), zap.Any("request", r))
		handleSsoError(w, r, redirectUri)
		return
	}

	// upgrade redirect url from the relay state for better accuracy
	redirectUri = fmt.Sprintf("%s://%s%s", parsedState.Scheme, parsedState.Host, "/login")

	// fetch domain by parsing relay state.
	domain, err := ah.AppDao().GetDomainFromSsoResponse(ctx, parsedState)
	if err != nil {
		handleSsoError(w, r, redirectUri)
		return
	}

	sp, err := domain.PrepareSamlRequest(parsedState)
	if err != nil {
		zap.L().Error("[receiveSAML] failed to prepare saml request for domain", zap.String("domain", domain.String()), zap.Error(err))
		handleSsoError(w, r, redirectUri)
		return
	}

	assertionInfo, err := sp.RetrieveAssertionInfo(r.FormValue("SAMLResponse"))
	if err != nil {
		zap.L().Error("[receiveSAML] failed to retrieve assertion info from  saml response", zap.String("domain", domain.String()), zap.Error(err))
		handleSsoError(w, r, redirectUri)
		return
	}

	if assertionInfo.WarningInfo.InvalidTime {
		zap.L().Error("[receiveSAML] expired saml response", zap.String("domain", domain.String()), zap.Error(err))
		handleSsoError(w, r, redirectUri)
		return
	}

	email := assertionInfo.NameID
	if email == "" {
		zap.L().Error("[receiveSAML] invalid email in the SSO response", zap.String("domain", domain.String()))
		handleSsoError(w, r, redirectUri)
		return
	}

	nextPage, err := ah.Signoz.Modules.User.PrepareSsoRedirect(ctx, redirectUri, email, ah.opts.JWT)
	if err != nil {
		zap.L().Error("[receiveSAML] failed to generate redirect URI after successful login ", zap.String("domain", domain.String()), zap.Error(err))
		handleSsoError(w, r, redirectUri)
		return
	}

	http.Redirect(w, r, nextPage, http.StatusSeeOther)
}
