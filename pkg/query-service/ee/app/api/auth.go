package api

import (
	"context"
	"fmt"
	"github.com/gorilla/mux"
	baseauth "go.signoz.io/query-service/auth"
	"go.signoz.io/query-service/ee/constants"
	"go.signoz.io/query-service/ee/model"
	"go.signoz.io/query-service/ee/saml"
	"go.uber.org/zap"
	"net/http"
)

// methods that use user authentication
// precheckLogin checks if SSO or SAML is available, the check happens
// when user enters email address in login screen.
func (aH *APIHandler) precheckLogin(w http.ResponseWriter, r *http.Request) {

	// todo(amol): validate email with org domain
	// email := r.URL.Query().Get("email")

	// path := r.URL.Query().Get("path")

	// type precheckLoginResponse struct {
	// 	SSOEnabled   bool   `json:"ssoEnabled"`
	// 	SAMLEnabled  bool   `json:"samlEnabled"`
	// 	SAMLLoginUrl string `json:"samlLoginUrl"`
	// }

	// var org *model.Organization
	// var apiError *model.ApiError

	// if !aH.IsMultiOrgAvailable {
	// 	org, apiError = aH.relationalDB.GetSingleOrg(context.Background())
	// 	if apiError != nil {
	// 		zap.S().Debugf("[precheckLogin] failed to fetch organization: %v", apiError)
	// 		RespondError(w, apiError, nil)
	// 		return
	// 	}
	// } else {
	// 	// todo(amol): read email address from request and determine org using domain
	// }

	// // todo(amol) just responding dummy data for now
	// precheckResp := precheckLoginResponse{
	// 	SSOEnabled:  org.IsSSOEnabled(),
	// 	SAMLEnabled: org.IsSAMLEnabled(),
	// }

	// if org.IsSAMLAvailable() {
	// 	loginURL, err := saml.BuildLoginURLWithOrg(org, path)
	// 	if err != nil {
	// 		RespondError(w, &model.ApiError{
	// 			Typ: model.ErrorInternal,
	// 			Err: err,
	// 		}, nil)
	// 		return
	// 	}
	// 	precheckResp.SAMLLoginUrl = loginURL
	// }

	// aH.WriteJSON(w, r, precheckResp)
}

func (ah *APIHandler) ReceiveSAML(w http.ResponseWriter, r *http.Request) {

	domainID := mux.Vars(r)["domain_id"]
	redirectUri := constants.GetSAMLRedirectURL()

	// get org
	domain, apiError := ah.AppDB().GetOrgDomain(context.Background(), domainID)
	if apiError != nil {
		zap.S().Errorf("[ReceiveSAML] failed to fetch organization (%s): %v", domainID, apiError)
		http.Redirect(w, r, fmt.Sprintf("%s?ssoerror=%s", redirectUri, "failed to identify user organization, please contact your administrator"), 301)
		return
	}

	if err := ah.CheckFeature(model.SSO); err != nil {
		zap.S().Errorf("[ReceiveSAML] feature unavailable %s in org %s", model.SAML, domainID)
		http.Redirect(w, r, fmt.Sprintf("%s?ssoerror=%s", redirectUri, "feature unavailable, please upgrade your billing plan to access this feature"), 301)
		return
	}

	sp, err := saml.PrepRequestWithOrg(domain, "")
	if err != nil {
		zap.S().Errorf("[ReceiveSAML] failed to prepare saml request for organization (%s): %v", domainID, err)
		http.Redirect(w, r, fmt.Sprintf("%s?ssoerror=%s", redirectUri, "failed to send request to SSO, please contact your administrator"), 301)
		return
	}

	err = r.ParseForm()
	if err != nil {
		http.Redirect(w, r, fmt.Sprintf("%s?ssoerror=%s", redirectUri, "failed to authenticate with the SSO provider"), 301)
		return
	}

	assertionInfo, err := sp.RetrieveAssertionInfo(r.FormValue("SAMLResponse"))
	if err != nil {
		zap.S().Errorf("[ReceiveSAML] failed to retrieve assertion info from  saml response for organization (%s): %v", domainID, err)
		http.Redirect(w, r, fmt.Sprintf("%s?ssoerror=%s", redirectUri, "user not found, please contact your administrator"), 301)
		return
	}

	if assertionInfo.WarningInfo.InvalidTime {
		zap.S().Errorf("[ReceiveSAML] expired saml response for organization (%s): %v", domainID, err)
		http.Redirect(w, r, fmt.Sprintf("%s?ssoerror=%s", redirectUri, "saml response expired, please contact your administrator"), 301)
		return
	}

	if assertionInfo.WarningInfo.NotInAudience {
		zap.S().Errorf("[ReceiveSAML] NotInAudience error for orgID: %s", domainID)
		http.Redirect(w, r, fmt.Sprintf("%s?ssoerror=%s", redirectUri, "this app does not have accesss to SSO provider login"), 301)
		return
	}

	email := assertionInfo.NameID
	firstName := assertionInfo.Values.Get("FirstName")
	lastName := assertionInfo.Values.Get("LastName")

	userPayload, err := ah.AppDB().FetchOrRegisterSAMLUser(email, firstName, lastName)
	if err != nil {
		zap.S().Errorf("[ReceiveSAML] failed to find or register a new user for email %s and org %s", email, domainID)
		http.Redirect(w, r, fmt.Sprintf("%s?ssoerror=%s", redirectUri, "failed to authenticate, please contact your administrator"), 301)
		return
	}

	tokenStore, err := baseauth.GenerateJWTForUser(&userPayload.User)
	if err != nil {
		zap.S().Errorf("[ReceiveSAML] failed to generate access token for email %s and org %s", email, domainID)
		http.Redirect(w, r, fmt.Sprintf("%s?ssoerror=%s", redirectUri, "failed to login, please contact your administrator"), 301)
		return
	}
	userID := userPayload.User.Id
	nextPage := fmt.Sprintf("%s?jwt=%s&usr=%s&refreshjwt=%s", redirectUri, tokenStore.AccessJwt, userID, tokenStore.RefreshJwt)

	http.Redirect(w, r, nextPage, 301)
}
