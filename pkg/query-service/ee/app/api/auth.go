package api

import (
	"context"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	baseauth "go.signoz.io/query-service/auth"
	"go.signoz.io/query-service/ee/constants"
	"go.signoz.io/query-service/ee/model"
	basemodel "go.signoz.io/query-service/model"
	"go.uber.org/zap"
)

// precheckLogin enables browser login page to display appropriate
// login methods
func (ah *APIHandler) precheckLogin(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	email := r.URL.Query().Get("email")

	type precheckResponse struct {
		SSO             bool   `json:"sso"`
		SsoUrl          string `json:"ssoUrl"`
		CanSelfRegister bool   `json:"canSelfRegister"`
		IsUser          bool   `json:"isUser"`
	}

	// assume user is valid unless proven otherwise
	resp := precheckResponse{IsUser: true, CanSelfRegister: false}

	// check if email is a valid user
	userPayload, apierr := ah.AppDao().GetUserByEmail(ctx, email)
	if apierr != nil {
		RespondError(w, apierr, &resp)
		return
	}

	if userPayload == nil {
		resp.IsUser = false
	}

	if ah.CheckFeature(model.SSO) && resp.IsUser {

		// find domain from email
		orgDomain, apierr := ah.AppDao().GetDomainByEmail(ctx, email)
		if apierr != nil {
			zap.S().Errorf("failed to get org domain during loginPrecheck()", apierr.Err)
			RespondError(w, apierr, &resp)
			return
		}
		fmt.Println("orgDomain:", orgDomain)
		if orgDomain != nil && orgDomain.SsoEnabled {
			// saml is enabled for this domain, lets prepare sso url
			org, apierr := ah.AppDao().GetOrg(ctx, orgDomain.OrgId)

			if apierr != nil {
				zap.S().Errorf("failed to get org when preparing SSO url", *apierr)
				RespondError(w, model.InternalError(fmt.Errorf("failed to prepare sso request")), &resp)
				return
			}

			siteUrl := org.GetSiteURL()
			if siteUrl == "" {
				siteUrl = constants.GetDefaultSiteURL()
			}

			var err error
			resp.SsoUrl, err = orgDomain.BuildSsoUrl(siteUrl, "")

			if err != nil {
				zap.S().Errorf("failed to prepare saml request for domain", zap.String("domain", orgDomain.Name), err)
				RespondError(w, model.InternalError(err), &resp)
				return
			}

			// set SSO to true, as the url is generated correctly
			resp.SSO = true
		}
	}

	ah.Respond(w, &resp)
}

func (ah *APIHandler) ReceiveSAML(w http.ResponseWriter, r *http.Request) {
	redirectUri := constants.GetDefaultSiteURL() + "/login"
	samlHost := constants.GetDefaultSamlHost()

	var apierr basemodel.BaseApiError
	var nextPage string

	redirectOnError := func() {
		http.Redirect(w, r, fmt.Sprintf("%s?ssoerror=%s", redirectUri, "Failed to login"), http.StatusMovedPermanently)
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

	relayState := r.FormValue("RelayState")
	zap.S().Debug("[ReceiveML] relay state", zap.String("relayState", relayState))

	if relayState == "" {
		zap.S().Errorf("[ReceiveSAML] failed to process response - invalid response from IDP", err, r)
		redirectOnError()
		return
	}

	domainIdStr := relayState
	domainId, err := uuid.Parse(domainIdStr)
	if err != nil {
		zap.S().Errorf("[ReceiveSAML] failed to process request- failed to parse domain id ifrom relay", zap.Error(err))
		redirectOnError()
		return
	}
	ctx := context.Background()

	domain, apierr := ah.AppDao().GetDomain(ctx, domainId)
	if !apierr.IsNil() {
		zap.S().Errorf("[ReceiveSAML] failed to process request- invalid domain", domainIdStr, zap.Error(apierr))
		redirectOnError()
		return
	}

	sp, err := domain.PrepareSamlRequest(samlHost, relayState)
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

	if assertionInfo.WarningInfo.NotInAudience {
		zap.S().Errorf("[ReceiveSAML] NotInAudience error for orgID: %s", domainId)
		redirectOnError()
		return
	}

	email := assertionInfo.NameID

	org, apierr := ah.AppDao().GetOrg(ctx, domain.OrgId)

	if !apierr.IsNil() {
		zap.S().Errorf("failed to get org while completing saml request", zap.Error(apierr))
		redirectOnError()
		return
	}

	if org.GetSiteURL() != "" {
		redirectUri = org.GetSiteURL()
	}

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
	nextPage = fmt.Sprintf("%s?jwt=%s&usr=%s&refreshjwt=%s", redirectUri, tokenStore.AccessJwt, userID, tokenStore.RefreshJwt)

	http.Redirect(w, r, nextPage, http.StatusMovedPermanently)
}
