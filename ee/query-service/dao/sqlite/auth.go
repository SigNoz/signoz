package sqlite

import (
	"context"
	"fmt"
	"net/url"
	"strings"

	"go.signoz.io/signoz/ee/query-service/constants"
	"go.signoz.io/signoz/ee/query-service/model"
	baseconst "go.signoz.io/signoz/pkg/query-service/constants"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
	baseauth "go.signoz.io/signoz/pkg/query-service/auth"
	"go.uber.org/zap"
)

// PrepareSsoRedirect prepares redirect page link after SSO response 
// is successfully parsed (i.e. valid email is available)
func (m *modelDao) PrepareSsoRedirect(ctx context.Context, redirectUri, email string) (redirectURL string, apierr basemodel.BaseApiError) {

	userPayload, apierr := m.GetUserByEmail(ctx, email)
	if !apierr.IsNil() {
		zap.S().Errorf(" failed to get user with email received from auth provider", apierr.Error())
		return "", model.BadRequestStr("invalid user email received from the auth provider")
	}

	tokenStore, err := baseauth.GenerateJWTForUser(&userPayload.User)
	if err != nil {
		zap.S().Errorf("failed to generate token for SSO login user", err)
		return "", model.InternalErrorStr("failed to generate token for the user")
	}

	return fmt.Sprintf("%s?jwt=%s&usr=%s&refreshjwt=%s",
		redirectUri,
		tokenStore.AccessJwt,
		userPayload.User.Id,
		tokenStore.RefreshJwt), nil
}

func (m *modelDao) CanUsePassword(ctx context.Context, email string) (bool, basemodel.BaseApiError) {
	domain, apierr := m.GetDomainByEmail(ctx, email)
	if apierr != nil {
		return false, apierr
	}

	if domain != nil && domain.SsoEnabled {
		// sso is enabled, check if the user has admin role
		userPayload, baseapierr := m.GetUserByEmail(ctx, email)

		if baseapierr != nil || userPayload == nil {
			return false, baseapierr
		}

		if userPayload.Role != baseconst.AdminGroup {
			return false, model.BadRequest(fmt.Errorf("auth method not supported"))
		}

	}

	return true, nil
}

// PrecheckLogin is called when the login or signup page is loaded
// to check sso login is to be prompted
func (m *modelDao) PrecheckLogin(ctx context.Context, email, sourceUrl string) (*model.PrecheckResponse, basemodel.BaseApiError) {

	// assume user is valid unless proven otherwise
	resp := &model.PrecheckResponse{IsUser: true, CanSelfRegister: false}

	// check if email is a valid user
	userPayload, baseApiErr := m.GetUserByEmail(ctx, email)
	if baseApiErr != nil {
		return resp, baseApiErr
	}

	if userPayload == nil {
		resp.IsUser = false
	}
	ssoAvailable := true
	err := m.checkFeature(model.SSO)
	if err != nil {
		switch err.(type) {
		case basemodel.ErrFeatureUnavailable:
			// do nothing, just skip sso
			ssoAvailable = false
		default:
			zap.S().Errorf("feature check failed", zap.String("featureKey", model.SSO), zap.Error(err))
			return resp, model.BadRequest(err)
		}
	}

	if ssoAvailable {

		// find domain from email
		orgDomain, apierr := m.GetDomainByEmail(ctx, email)
		if apierr != nil {
			var emailDomain string
			emailComponents := strings.Split(email, "@")
			if len(emailComponents) > 0 {
				emailDomain = emailComponents[1]
			}
			zap.S().Errorf("failed to get org domain from email", zap.String("emailDomain", emailDomain), apierr.ToError())
			return resp, apierr
		}

		if orgDomain != nil && orgDomain.SsoEnabled {
			// saml is enabled for this domain, lets prepare sso url

			if sourceUrl == "" {
				sourceUrl = constants.GetDefaultSiteURL()
			}

			// parse source url that generated the login request
			var err error
			escapedUrl, _ := url.QueryUnescape(sourceUrl)
			siteUrl, err := url.Parse(escapedUrl)
			if err != nil {
				zap.S().Errorf("failed to parse referer", err)
				return resp, model.InternalError(fmt.Errorf("failed to generate login request"))
			}

			// build Idp URL that will authenticat the user
			// the front-end will redirect user to this url
			resp.SsoUrl, err = orgDomain.BuildSsoUrl(siteUrl)

			if err != nil {
				zap.S().Errorf("failed to prepare saml request for domain", zap.String("domain", orgDomain.Name), err)
				return resp, model.InternalError(err)
			}

			// set SSO to true, as the url is generated correctly
			resp.SSO = true
		}
	}
	return resp, nil
}
