package api

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"github.com/gorilla/mux"
	"go.signoz.io/signoz/ee/query-service/constants"
	"go.signoz.io/signoz/ee/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/auth"
	baseauth "go.signoz.io/signoz/pkg/query-service/auth"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
)

func parseRequest(r *http.Request, req interface{}) error {
	defer r.Body.Close()
	requestBody, err := ioutil.ReadAll(r.Body)
	if err != nil {
		return err
	}

	err = json.Unmarshal(requestBody, &req)
	return err
}

// loginUser overrides base handler and considers SSO case.
func (ah *APIHandler) loginUser(w http.ResponseWriter, r *http.Request) {

	req := basemodel.LoginRequest{}
	err := parseRequest(r, &req)
	if err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	ctx := context.Background()

	if req.Email != "" && ah.CheckFeature(model.SSO) {
		var apierr basemodel.BaseApiError
		_, apierr = ah.AppDao().CanUsePassword(ctx, req.Email)
		if apierr != nil && !apierr.IsNil() {
			RespondError(w, apierr, nil)
		}
	}

	// if all looks good, call auth
	resp, err := auth.Login(ctx, &req)
	if ah.HandleError(w, err, http.StatusUnauthorized) {
		return
	}

	ah.WriteJSON(w, r, resp)
}

// registerUser registers a user and responds with a precheck
// so the front-end can decide the login method
func (ah *APIHandler) registerUser(w http.ResponseWriter, r *http.Request) {

	if !ah.CheckFeature(model.SSO) {
		ah.APIHandler.Register(w, r)
		return
	}

	ctx := context.Background()
	var req *baseauth.RegisterRequest

	defer r.Body.Close()
	requestBody, err := ioutil.ReadAll(r.Body)
	if err != nil {
		zap.S().Errorf("received no input in api\n", err)
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	err = json.Unmarshal(requestBody, &req)

	if err != nil {
		zap.S().Errorf("received invalid user registration request", zap.Error(err))
		RespondError(w, model.BadRequest(fmt.Errorf("failed to register user")), nil)
		return
	}

	// get invite object
	invite, err := baseauth.ValidateInvite(ctx, req)
	if err != nil || invite == nil {
		zap.S().Errorf("failed to validate invite token", err)
		RespondError(w, model.BadRequest(basemodel.ErrSignupFailed{}), nil)
	}

	// get auth domain from email domain
	domain, apierr := ah.AppDao().GetDomainByEmail(ctx, invite.Email)
	if apierr != nil {
		zap.S().Errorf("failed to get domain from email", apierr)
		RespondError(w, model.InternalError(basemodel.ErrSignupFailed{}), nil)
	}

	precheckResp := &model.PrecheckResponse{
		SSO:    false,
		IsUser: false,
	}

	if domain != nil && domain.SsoEnabled {
		// so is enabled, create user and respond precheck data
		user, apierr := baseauth.RegisterInvitedUser(ctx, req, true)
		if apierr != nil {
			RespondError(w, apierr, nil)
			return
		}

		var precheckError basemodel.BaseApiError

		precheckResp, precheckError = ah.AppDao().PrecheckLogin(ctx, user.Email, req.SourceUrl)
		if precheckError != nil {
			RespondError(w, precheckError, precheckResp)
		}

	} else {
		// no-sso, validate password
		if err := auth.ValidatePassword(req.Password); err != nil {
			RespondError(w, model.InternalError(fmt.Errorf("password is not in a valid format")), nil)
			return
		}

		_, registerError := baseauth.Register(ctx, req)
		if !registerError.IsNil() {
			RespondError(w, apierr, nil)
			return
		}

		precheckResp.IsUser = true
	}

	ah.Respond(w, precheckResp)
}

// getInvite returns the invite object details for the given invite token. We do not need to
// protect this API because invite token itself is meant to be private.
func (ah *APIHandler) getInvite(w http.ResponseWriter, r *http.Request) {
	token := mux.Vars(r)["token"]
	sourceUrl := r.URL.Query().Get("ref")
	ctx := context.Background()

	inviteObject, err := baseauth.GetInvite(context.Background(), token)
	if err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	resp := model.GettableInvitation{
		InvitationResponseObject: inviteObject,
	}

	precheck, apierr := ah.AppDao().PrecheckLogin(ctx, inviteObject.Email, sourceUrl)
	resp.Precheck = precheck

	if apierr != nil {
		RespondError(w, apierr, resp)
	}

	ah.WriteJSON(w, r, resp)
}

// PrecheckLogin enables browser login page to display appropriate
// login methods
func (ah *APIHandler) precheckLogin(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	email := r.URL.Query().Get("email")
	sourceUrl := r.URL.Query().Get("ref")

	resp, apierr := ah.AppDao().PrecheckLogin(ctx, email, sourceUrl)
	if apierr != nil {
		RespondError(w, apierr, resp)
	}

	ah.Respond(w, resp)
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
		zap.S().Errorf("[receiveGoogleAuth] sso requested but feature unavailable %s in org domain %s", model.SSO)
		http.Redirect(w, r, fmt.Sprintf("%s?ssoerror=%s", redirectUri, "feature unavailable, please upgrade your billing plan to access this feature"), http.StatusMovedPermanently)
		return
	}

	q := r.URL.Query()
	if errType := q.Get("error"); errType != "" {
		zap.S().Errorf("[receiveGoogleAuth] failed to login with google auth", q.Get("error_description"))
		http.Redirect(w, r, fmt.Sprintf("%s?ssoerror=%s", redirectUri, "failed to login through SSO "), http.StatusMovedPermanently)
		return
	}

	relayState := q.Get("state")
	zap.S().Debug("[receiveGoogleAuth] relay state received", zap.String("state", relayState))

	parsedState, err := url.Parse(relayState)
	if err != nil || relayState == "" {
		zap.S().Errorf("[receiveGoogleAuth] failed to process response - invalid response from IDP", err, r)
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

	identity, err := callbackHandler.HandleCallback(r)
	if err != nil {
		zap.S().Errorf("[receiveGoogleAuth] failed to process HandleCallback ", domain.String(), zap.Error(err))
		handleSsoError(w, r, redirectUri)
		return
	}
	
	nextPage, err := ah.AppDao().PrepareSsoRedirect(ctx, redirectUri, identity.Email)
	if err != nil {
		zap.S().Errorf("[receiveGoogleAuth] failed to generate redirect URI after successful login ", domain.String(), zap.Error(err))
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
		zap.S().Errorf("[receiveSAML] sso requested but feature unavailable %s in org domain %s", model.SSO)
		http.Redirect(w, r, fmt.Sprintf("%s?ssoerror=%s", redirectUri, "feature unavailable, please upgrade your billing plan to access this feature"), http.StatusMovedPermanently)
		return
	}

	err := r.ParseForm()
	if err != nil {
		zap.S().Errorf("[receiveSAML] failed to process response - invalid response from IDP", err, r)
		handleSsoError(w, r, redirectUri)
		return
	}

	// the relay state is sent when a login request is submitted to
	// Idp.
	relayState := r.FormValue("RelayState")
	zap.S().Debug("[receiveML] relay state", zap.String("relayState", relayState))

	parsedState, err := url.Parse(relayState)
	if err != nil || relayState == "" {
		zap.S().Errorf("[receiveSAML] failed to process response - invalid response from IDP", err, r)
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
		zap.S().Errorf("[receiveSAML] failed to prepare saml request for domain (%s): %v", domain.String(), err)
		handleSsoError(w, r, redirectUri)
		return
	}

	assertionInfo, err := sp.RetrieveAssertionInfo(r.FormValue("SAMLResponse"))
	if err != nil {
		zap.S().Errorf("[receiveSAML] failed to retrieve assertion info from  saml response for organization (%s): %v", domain.String(), err)
		handleSsoError(w, r, redirectUri)
		return
	}

	if assertionInfo.WarningInfo.InvalidTime {
		zap.S().Errorf("[receiveSAML] expired saml response for organization (%s): %v", domain.String(), err)
		handleSsoError(w, r, redirectUri)
		return
	}

	email := assertionInfo.NameID
	if email == "" {
		zap.S().Errorf("[receiveSAML] invalid email in the SSO response (%s)", domain.String())
		handleSsoError(w, r, redirectUri)
		return
	}

	nextPage, err := ah.AppDao().PrepareSsoRedirect(ctx, redirectUri, email)
	if err != nil {
		zap.S().Errorf("[receiveSAML] failed to generate redirect URI after successful login ", domain.String(), zap.Error(err))
		handleSsoError(w, r, redirectUri)
		return
	}
	
	http.Redirect(w, r, nextPage, http.StatusSeeOther)
}
