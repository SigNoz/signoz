package api

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"go.signoz.io/query-service/auth"
	baseauth "go.signoz.io/query-service/auth"
	"go.signoz.io/query-service/ee/constants"
	"go.signoz.io/query-service/ee/model"
	basemodel "go.signoz.io/query-service/model"
	"go.uber.org/zap"
)

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

	fmt.Println("req:", req)
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

func (ah *APIHandler) receiveSAML(w http.ResponseWriter, r *http.Request) {
	// this is the source url that initiated the login request
	redirectUri := constants.GetDefaultSiteURL()
	ctx := context.Background()

	var apierr basemodel.BaseApiError

	redirectOnError := func() {
		ssoError := []byte("Login failed. Please contact your system administrator")
		dst := make([]byte, base64.StdEncoding.EncodedLen(len(ssoError)))
		base64.StdEncoding.Encode(dst, ssoError)

		http.Redirect(w, r, fmt.Sprintf("%s?ssoerror=%s", redirectUri, string(dst)), http.StatusMovedPermanently)
	}

	if !ah.CheckFeature(model.SSO) {
		zap.S().Errorf("[ReceiveSAML] sso requested but feature unavailable %s in org domain %s", model.SSO)
		http.Redirect(w, r, fmt.Sprintf("%s?ssoerror=%s", redirectUri, "feature unavailable, please upgrade your billing plan to access this feature"), http.StatusMovedPermanently)
		return
	}

	err := r.ParseForm()
	if err != nil {
		zap.S().Errorf("[ReceiveSAML] failed to process response - invalid response from IDP", err, r)
		redirectOnError()
		return
	}

	// the relay state is sent when a login request is submitted to
	// Idp.
	relayState := r.FormValue("RelayState")
	zap.S().Debug("[ReceiveML] relay state", zap.String("relayState", relayState))

	parsedState, err := url.Parse(relayState)
	if err != nil || relayState == "" {
		zap.S().Errorf("[ReceiveSAML] failed to process response - invalid response from IDP", err, r)
		redirectOnError()
		return
	}

	// upgrade redirect url from the relay state for better accuracy
	redirectUri = fmt.Sprintf("%s://%s%s", parsedState.Scheme, parsedState.Host, "/login")

	// derive domain id from relay state now
	var domainIdStr string
	for k, v := range parsedState.Query() {
		if k == "domainId" && len(v) > 0 {
			domainIdStr = strings.Replace(v[0], ":", "-", -1)
		}
	}

	domainId, err := uuid.Parse(domainIdStr)
	if err != nil {
		zap.S().Errorf("[ReceiveSAML] failed to process request- failed to parse domain id ifrom relay", zap.Error(err))
		redirectOnError()
		return
	}

	domain, apierr := ah.AppDao().GetDomain(ctx, domainId)
	fmt.Println("apierr:", apierr)
	if (apierr != nil) || domain == nil {
		zap.S().Errorf("[ReceiveSAML] failed to process request- invalid domain", domainIdStr, zap.Error(apierr))
		redirectOnError()
		return
	}

	// todo(amol): remove this before merging. adding this for testing purpose
	parsedState.Host = "localhost:8080"

	sp, err := domain.PrepareSamlRequest(parsedState)
	if err != nil {
		zap.S().Errorf("[ReceiveSAML] failed to prepare saml request for domain (%s): %v", domainId, err)
		redirectOnError()
		return
	}

	assertionInfo, err := sp.RetrieveAssertionInfo(r.FormValue("SAMLResponse"))
	if err != nil {
		zap.S().Errorf("[ReceiveSAML] failed to retrieve assertion info from  saml response for organization (%s): %v", domainId, err)
		redirectOnError()
		return
	}

	if assertionInfo.WarningInfo.InvalidTime {
		zap.S().Errorf("[ReceiveSAML] expired saml response for organization (%s): %v", domainId, err)
		redirectOnError()
		return
	}

	email := assertionInfo.NameID

	// user email found, now start preparing jwt response
	userPayload, baseapierr := ah.AppDao().GetUserByEmail(ctx, email)
	if baseapierr != nil {
		zap.S().Errorf("[ReceiveSAML] failed to find or register a new user for email %s and org %s", email, domainId, zap.Error(baseapierr.Err))
		redirectOnError()
		return
	}

	tokenStore, err := baseauth.GenerateJWTForUser(&userPayload.User)
	if err != nil {
		zap.S().Errorf("[ReceiveSAML] failed to generate access token for email %s and org %s", email, domainId, zap.Error(err))
		redirectOnError()
		return
	}

	userID := userPayload.User.Id
	nextPage := fmt.Sprintf("%s?jwt=%s&usr=%s&refreshjwt=%s",
		redirectUri,
		tokenStore.AccessJwt,
		userID,
		tokenStore.RefreshJwt)

	http.Redirect(w, r, nextPage, http.StatusMovedPermanently)
}
