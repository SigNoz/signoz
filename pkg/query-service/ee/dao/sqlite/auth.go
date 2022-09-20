package sqlite

import (
	"context"
	"fmt"
	"net/url"
	"strings"

	"go.signoz.io/query-service/ee/constants"
	"go.signoz.io/query-service/ee/model"
	basemodel "go.signoz.io/query-service/model"
	"go.uber.org/zap"
)

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

	err := m.checkFeature(model.SSO)
	if err != nil {
		zap.S().Errorf("feature check failed", zap.String("featureKey", model.SSO), zap.Error(err))
		return resp, model.BadRequest(err)
	}

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
		siteUrl, err := url.Parse(sourceUrl)
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
	return resp, nil
}
